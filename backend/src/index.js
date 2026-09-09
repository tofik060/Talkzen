require("dotenv").config();
const express = require("express");
const port = process.env.PORT || 3000;
require("./db/conn");
const bodyParser = require("body-parser");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");
const fs = require("fs");
const user = require("./models/users");
const Message = require("./models/message");
const Contact = require("./models/contact");
const multer = require("multer");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const authMiddleware = require("./middleware/auth");

function pairFilter(userA, userB) {
  return {
    $or: [
      { requester: userA, recipient: userB },
      { requester: userB, recipient: userA },
    ],
  };
}

async function findContactBetween(userA, userB) {
  return Contact.findOne(pairFilter(userA, userB));
}

async function areAcceptedContacts(userA, userB) {
  const link = await findContactBetween(userA, userB);
  return !!(link && link.status === "accepted");
}

function unfollowedByIds(link) {
  return (link?.unfollowedBy || []).map((id) => String(id));
}

function hasUnfollowed(link, userId) {
  return unfollowedByIds(link).includes(String(userId));
}

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:4200",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/uploads", express.static(uploadsDir));

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
var upload = multer({
  storage: storage,
}).single("image");

app.get("/api/user-register", authMiddleware, (req, res) => {
  user
    .find()
    .select("-password -confirmPassword")
    .then((data) => {
      res.json(data);
    })
    .catch((error) => {
      res.send({
        message: error.message,
        status: 500,
      });
    });
});

app.post("/api/user-register", upload, async (req, res) => {
  try {
    const password = req.body.password;
    const confirmPassword = req.body.confirmPassword;
    const image = req.file
      ? `/uploads/${req.file.filename}`
      : req.body.image || null;

    if (password === confirmPassword) {
      const userRegister = new user({
        name: req.body.name,
        email: req.body.email,
        password: password,
        confirmPassword: confirmPassword,
        phone: req.body.phone,
        image: image,
        location: req.body.location,
      });
      await userRegister.save();
      return res.json({
        message: "Successfully register",
        status: 200,
      });
    } else {
      return res.status(400).json({
        message: "password are not match",
        status: 400,
      });
    }
  } catch (error) {
    return res.status(500).json({
      message: "Not register",
      status: 500,
    });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const email = req.body.email;
    const password = req.body.password;

    const userData = await user.findOne({ email: email });
    if (!userData) {
      return res.status(401).json({
        message: "Invalid Details",
        status: 401,
      });
    }

    const passwordMatch = await bcrypt.compare(password, userData.password);
    if (passwordMatch) {
      const token = jwt.sign(
        {
          id: userData._id,
          name: userData.name,
          email: userData.email,
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
      );

      const safeUser = userData.toObject();
      delete safeUser.password;
      delete safeUser.confirmPassword;

      res.json({
        message: "Login Successfull",
        status: 200,
        token: token,
        userData: safeUser,
      });
    } else {
      res.status(401).json({
        message: "password are not match",
        status: 401,
      });
    }
  } catch (error) {
    res.status(500).json({
      message: "Invalid Details",
      status: 500,
    });
  }
});

app.get("/api/message", authMiddleware, async (req, res) => {
  try {
    const { userId, peerId } = req.query;

    if (userId && peerId) {
      const Data = await Message.find({
        $or: [
          { senderId: userId, receiverId: peerId },
          { senderId: peerId, receiverId: userId },
        ],
      }).sort({ timestamp: 1 });

      return res.json({
        Data,
        status: 200,
      });
    }

    const Data = await Message.find().sort({ timestamp: 1 });
    return res.json({
      Data,
      status: 200,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
      status: 500,
    });
  }
});

app.post("/api/message", authMiddleware, async (req, res) => {
  try {
    const senderId = req.body.senderId || req.user.id;
    const receiverId = req.body.receiverId;
    const message = req.body.message;
    const name = req.body.name;

    if (!senderId || !receiverId || !message) {
      return res.status(400).json({
        message: "senderId, receiverId and message are required",
        status: 400,
      });
    }

    const allowed = await areAcceptedContacts(senderId, receiverId);
    if (!allowed) {
      return res.status(403).json({
        message:
          "You can't send messages because this contact is not connected or has unfollowed you",
        status: 403,
      });
    }

    const chatmsg = new Message({
      senderId,
      receiverId,
      name,
      message,
      read: false,
    });
    const chatmessage = await chatmsg.save();
    res.json({
      message: "successfully insert Chat message",
      data: chatmessage,
      status: 200,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      status: 500,
    });
  }
});

app.post("/api/message/read", authMiddleware, async (req, res) => {
  try {
    const me = String(req.user.id);
    const peerId = String(req.body.peerId || "");

    if (!peerId) {
      return res.status(400).json({
        message: "peerId is required",
        status: 400,
      });
    }

    const result = await Message.updateMany(
      {
        senderId: peerId,
        receiverId: me,
        $or: [{ read: false }, { read: { $exists: false } }],
      },
      { $set: { read: true } }
    );

    res.json({
      status: 200,
      message: "Messages marked as read",
      updated: result.modifiedCount || 0,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
      status: 500,
    });
  }
});

app.get("/api/contacts", authMiddleware, async (req, res) => {
  try {
    const me = String(req.user.id);
    const allUsers = await user.find().select("-password -confirmPassword");
    const links = await Contact.find({
      $or: [{ requester: me }, { recipient: me }],
    });

    const byPeer = new Map();
    links.forEach((link) => {
      const requester = String(link.requester);
      const recipient = String(link.recipient);
      const peerId = requester === me ? recipient : requester;
      byPeer.set(peerId, link);
    });

    const contacts = allUsers
      .filter((u) => String(u._id) !== me)
      .map((u) => {
        const peerId = String(u._id);
        const link = byPeer.get(peerId);
        let status = "none";
        let direction = null;
        let contactId = null;
        let iUnfollowed = false;
        let peerUnfollowed = false;
        let canMessage = false;

        if (link) {
          contactId = link._id;
          direction =
            String(link.requester) === me ? "outgoing" : "incoming";
          iUnfollowed = hasUnfollowed(link, me);
          peerUnfollowed = hasUnfollowed(link, peerId);

          if (link.status === "accepted") {
            status = "accepted";
            canMessage = true;
          } else if (link.status === "pending") {
            status = "pending";
          } else if (link.status === "unfollowed") {
            if (iUnfollowed && peerUnfollowed) {
              status = "unfollowed";
            } else if (iUnfollowed) {
              status = "unfollowed";
            } else if (peerUnfollowed) {
              status = "unfollowed_by_peer";
            } else {
              status = "unfollowed";
            }
          }
        }

        return {
          ...u.toObject(),
          contactStatus: status,
          contactDirection: direction,
          contactId,
          canMessage,
          iUnfollowed,
          peerUnfollowed,
        };
      });

    res.json({ status: 200, contacts });
  } catch (error) {
    res.status(500).json({
      message: error.message,
      status: 500,
    });
  }
});

app.get("/api/chats", authMiddleware, async (req, res) => {
  try {
    const me = String(req.user.id);
    const links = await Contact.find({
      status: { $in: ["accepted", "unfollowed"] },
      $or: [{ requester: me }, { recipient: me }],
    });

    // Keep chats I did not leave. If I unfollowed, hide. If peer unfollowed me, keep.
    // Legacy mutual unfollows (no unfollowedBy) stay hidden for both.
    const visibleLinks = links.filter((link) => {
      if (link.status === "accepted") return true;
      if (link.status !== "unfollowed") return false;
      const left = unfollowedByIds(link);
      if (!left.length) return false;
      return !left.includes(me);
    });

    const peerIds = visibleLinks.map((link) =>
      String(link.requester) === me ? link.recipient : link.requester
    );

    const chats = await user
      .find({ _id: { $in: peerIds } })
      .select("-password -confirmPassword");

    const enriched = await Promise.all(
      chats.map(async (u) => {
        const peerId = String(u._id);
        const link = visibleLinks.find((l) => {
          const peer =
            String(l.requester) === me
              ? String(l.recipient)
              : String(l.requester);
          return peer === peerId;
        });

        const peerUnfollowed = link ? hasUnfollowed(link, peerId) : false;
        const canMessage = link?.status === "accepted" && !peerUnfollowed;

        const lastMessage = await Message.findOne({
          $or: [
            { senderId: me, receiverId: peerId },
            { senderId: peerId, receiverId: me },
          ],
        }).sort({ timestamp: -1 });

        const unreadCount = await Message.countDocuments({
          senderId: peerId,
          receiverId: me,
          $or: [{ read: false }, { read: { $exists: false } }],
        });

        return {
          ...u.toObject(),
          contactStatus: canMessage
            ? "accepted"
            : peerUnfollowed
              ? "unfollowed_by_peer"
              : link?.status || "accepted",
          contactId: link?._id || null,
          canMessage,
          peerUnfollowed,
          unreadCount,
          lastMessage: lastMessage?.message || "",
          lastMessageTime: lastMessage?.timestamp || null,
          lastMessageMine: lastMessage
            ? String(lastMessage.senderId) === me
            : false,
        };
      })
    );

    enriched.sort((a, b) => {
      const ta = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
      const tb = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
      return tb - ta;
    });

    res.json({ status: 200, chats: enriched });
  } catch (error) {
    res.status(500).json({
      message: error.message,
      status: 500,
    });
  }
});

app.post("/api/contacts/request", authMiddleware, async (req, res) => {
  try {
    const me = String(req.user.id);
    const targetId = String(req.body.userId || "");

    if (!targetId || targetId === me) {
      return res.status(400).json({
        message: "Valid userId is required",
        status: 400,
      });
    }

    const target = await user.findById(targetId).select("_id");
    if (!target) {
      return res.status(404).json({
        message: "User not found",
        status: 404,
      });
    }

    let link = await findContactBetween(me, targetId);

    if (link) {
      if (link.status === "accepted") {
        return res.status(400).json({
          message: "Already connected",
          status: 400,
        });
      }
      if (link.status === "pending") {
        return res.status(400).json({
          message: "Request already pending",
          status: 400,
        });
      }

      link.requester = me;
      link.recipient = targetId;
      link.status = "pending";
      link.unfollowedBy = [];
      link.timestamp = new Date();
      await link.save();
    } else {
      link = await Contact.create({
        requester: me,
        recipient: targetId,
        status: "pending",
        unfollowedBy: [],
      });
    }

    res.json({
      status: 200,
      message: "Contact request sent",
      contact: link,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
      status: 500,
    });
  }
});

app.post("/api/contacts/accept", authMiddleware, async (req, res) => {
  try {
    const me = String(req.user.id);
    const contactId = req.body.contactId;
    const userId = req.body.userId ? String(req.body.userId) : null;

    let link = null;
    if (contactId) {
      link = await Contact.findById(contactId);
    } else if (userId) {
      link = await findContactBetween(me, userId);
    }

    if (!link || link.status !== "pending") {
      return res.status(404).json({
        message: "Pending request not found",
        status: 404,
      });
    }

    if (String(link.recipient) !== me) {
      return res.status(403).json({
        message: "Only the recipient can accept this request",
        status: 403,
      });
    }

    link.status = "accepted";
    link.unfollowedBy = [];
    await link.save();

    res.json({
      status: 200,
      message: "Contact request accepted",
      contact: link,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
      status: 500,
    });
  }
});

app.post("/api/contacts/reject", authMiddleware, async (req, res) => {
  try {
    const me = String(req.user.id);
    const contactId = req.body.contactId;
    const userId = req.body.userId ? String(req.body.userId) : null;

    let link = null;
    if (contactId) {
      link = await Contact.findById(contactId);
    } else if (userId) {
      link = await findContactBetween(me, userId);
    }

    if (!link || link.status !== "pending") {
      return res.status(404).json({
        message: "Pending request not found",
        status: 404,
      });
    }

    if (String(link.recipient) !== me && String(link.requester) !== me) {
      return res.status(403).json({
        message: "Not allowed",
        status: 403,
      });
    }

    await link.deleteOne();

    res.json({
      status: 200,
      message: "Contact request rejected",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
      status: 500,
    });
  }
});

app.post("/api/contacts/unfollow", authMiddleware, async (req, res) => {
  try {
    const me = String(req.user.id);
    const targetId = String(req.body.userId || "");

    if (!targetId) {
      return res.status(400).json({
        message: "userId is required",
        status: 400,
      });
    }

    const link = await findContactBetween(me, targetId);
    if (!link) {
      return res.status(404).json({
        message: "Contact not found",
        status: 404,
      });
    }

    // Can unfollow while accepted, or while peer already unfollowed me (still visible in my chats)
    const iAlreadyLeft = hasUnfollowed(link, me);
    if (iAlreadyLeft) {
      return res.status(400).json({
        message: "You already unfollowed this contact",
        status: 400,
      });
    }

    if (link.status !== "accepted" && link.status !== "unfollowed") {
      return res.status(404).json({
        message: "Accepted contact not found",
        status: 404,
      });
    }

    const list = unfollowedByIds(link);
    if (!list.includes(me)) {
      link.unfollowedBy = [...list, me];
    }
    link.status = "unfollowed";
    await link.save();

    res.json({
      status: 200,
      message: "Unfollowed successfully",
      contact: link,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
      status: 500,
    });
  }
});

app.get("/api/user-register/:id", authMiddleware, (req, res) => {
  const id = req.params.id;
  user
    .findById(id)
    .select("-password -confirmPassword")
    .then((data) => {
      res.json(data);
    })
    .catch((error) => {
      res.send({
        message: "Message not get",
        status: 500,
      });
    });
});

app.get("/api/me", authMiddleware, async (req, res) => {
  try {
    const currentUser = await user
      .findById(req.user.id)
      .select("-password -confirmPassword");
    if (!currentUser) {
      return res.status(404).json({
        message: "User not found",
        status: 404,
      });
    }
    res.json({
      status: 200,
      userData: currentUser,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
      status: 500,
    });
  }
});

app.put("/api/me", authMiddleware, async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const phone = String(req.body.phone || "").trim();
    const location = String(req.body.location || "").trim();
    const image =
      typeof req.body.image === "string" ? req.body.image.trim() : "";

    if (!name || !email || !phone || !location) {
      return res.status(400).json({
        message: "Name, email, phone and location are required",
        status: 400,
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        message: "Please enter a valid email",
        status: 400,
      });
    }

    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({
        message: "Phone must be a 10-digit number",
        status: 400,
      });
    }

    const me = String(req.user.id);

    const emailTaken = await user.findOne({
      email,
      _id: { $ne: me },
    });
    if (emailTaken) {
      return res.status(400).json({
        message: "Email is already in use",
        status: 400,
      });
    }

    const phoneTaken = await user.findOne({
      phone,
      _id: { $ne: me },
    });
    if (phoneTaken) {
      return res.status(400).json({
        message: "Phone number is already in use",
        status: 400,
      });
    }

    const updatedUser = await user
      .findByIdAndUpdate(
        me,
        {
          name,
          email,
          phone,
          location,
          image: image || null,
        },
        { new: true }
      )
      .select("-password -confirmPassword");

    if (!updatedUser) {
      return res.status(404).json({
        message: "User not found",
        status: 404,
      });
    }

    res.json({
      status: 200,
      message: "Profile updated successfully",
      userData: updatedUser,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
      status: 500,
    });
  }
});

app.post("/api/change-password", authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        message: "All password fields are required",
        status: 400,
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        message: "New passwords do not match",
        status: 400,
      });
    }

    if (
      !/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&#^()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/.test(
        newPassword
      )
    ) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters and include a letter, number, and symbol",
        status: 400,
      });
    }

    const currentUser = await user.findById(req.user.id);
    if (!currentUser) {
      return res.status(404).json({
        message: "User not found",
        status: 404,
      });
    }

    const passwordMatch = await bcrypt.compare(
      currentPassword,
      currentUser.password
    );
    if (!passwordMatch) {
      return res.status(401).json({
        message: "Current password is incorrect",
        status: 401,
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        message: "You already have this password",
        status: 400,
      });
    }

    currentUser.password = newPassword;
    currentUser.confirmPassword = confirmPassword;
    await currentUser.save();

    res.json({
      status: 200,
      message: "Password updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
      status: 500,
    });
  }
});

const users = {};

io.use(async (socket, next) => {
  const authHeader = socket.handshake.headers?.authorization;
  const token =
    socket.handshake.auth?.token ||
    (typeof authHeader === "string" && authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null) ||
    socket.handshake.query?.token;

  if (!token || typeof token !== "string") {
    return next(new Error("Authentication error: auth token required"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const existingUser = await user
      .findById(decoded.id)
      .select("_id name email");

    if (!existingUser) {
      return next(new Error("Authentication error: user not found"));
    }

    socket.user = {
      id: existingUser._id,
      name: existingUser.name,
      email: existingUser.email,
    };
    next();
  } catch (error) {
    return next(new Error("Authentication error: invalid or expired token"));
  }
});

io.on("connection", (socket) => {
  socket.on("new-user-joined", ({ name }) => {
    const userName = name || socket.user?.name;
    users[socket.id] = userName;

    socket.broadcast.emit("user-joined", userName);
    io.emit("users-list", users);
    socket.emit("user-name", userName);
  });

  socket.on("chat-msg", (msg) => {
    if (!socket.user) {
      return;
    }
    socket.broadcast.emit("receive", msg);
  });

  socket.on("disconnect", () => {
    socket.broadcast.emit("leave", users[socket.id]);
    delete users[socket.id];
    io.emit("users-list", users);
  });
});

server.listen(port);

app.get("/", (req, res) => {
  res.send("Invalid Endpoint");
});
