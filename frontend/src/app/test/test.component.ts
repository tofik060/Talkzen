import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ChatAppService } from '../services/chat-app.service';

@Component({
  selector: 'app-test',
  templateUrl: './test.component.html',
  styleUrls: ['./test.component.css'],
})
export class TestComponent implements OnInit, AfterViewInit {
  @ViewChild('popup', { static: false }) popup: any;

  public roomId: string = '';
  public messageText: string = '';
  public messageArray: { user: string; message: string }[] = [];
  public storageArray: any = [];

  public showScreen: boolean = false;
  public userName: string = '';
  public currentUser: any;
  public selectedUser: any;

  public userList = [
    {
      id: 1,
      name: 'Anil',
      userName: 'anil',
      image: '../../assets/wp5732311-one-piece-anime-4k-wallpapers.jpg',
      roomId: {
        2: 'room-1',
        3: 'room-2',
        4: 'room-3',
      },
    },
    {
      id: 2,
      name: 'Mahesh',
      userName: 'mahesh',
      image: '../../assets/8ff9bdf60dc25ee46023702038c1d2fc.jpg',
      roomId: {
        1: 'room-1',
        3: 'room-4',
        4: 'room-5',
      },
    },
    {
      id: 3,
      name: 'Rakesh',
      userName: 'rakesh',
      image: '../../assets/wallpaperflare.com_wallpaper.jpg',
      roomId: {
        1: 'room-2',
        2: 'room-4',
        4: 'room-6',
      },
    },
    {
      id: 4,
      name: 'Mohit',
      userName: 'mohit',
      image:
        '../../assets/wallpapersden.com_anime-naruto-hd-2023-ai_1920x1080.jpg',
      roomId: {
        1: 'room-3',
        2: 'room-5',
        3: 'room-6',
      },
    },
  ];
  constructor(
    private modalService: NgbModal,
    private chatAppService: ChatAppService
  ) {}

  ngOnInit(): void {
    this.chatAppService
      .getMessage()
      .subscribe((data: { user: string; room: string; message: string }) => {
    

        if (this.roomId) {
          setTimeout(() => {
            this.messageArray.push(data);
            this.storageArray = this.chatAppService.getStorage();
            const storageIndex = this.storageArray.findIndex(
              (storage: any) => storage.roomId === this.roomId
            );
            this.messageArray = this.storageArray[storageIndex].chats;
            console.log('message Array : ', this.messageArray);
          }, 500);
        }
      });
  }

  ngAfterViewInit(): void {
    this.openPopup(this.popup);
  }

  openPopup(content: any): void {
    this.modalService.open(content, { backdrop: 'static', centered: true });
  }

  login(dismiss: any) {
    this.currentUser = this.userList.find(
      (user) => user.userName === this.userName.toString()
    );
    this.userList = this.userList.filter(
      (user) => user.userName !== this.userName.toString()
    );

    if (this.userList) {
      this.showScreen = true;
      dismiss();
    }
    console.log('Current user : ', this.currentUser);
    console.log('Login user : ', this.userList);
  }

  selectUserHandler(userName: String): void {
    this.selectedUser = this.userList.find(
      (user) => user.userName === userName
    );
    this.roomId = this.selectedUser.roomId[this.currentUser.id];
    this.messageArray = [];
    console.log("selected : ", this.selectedUser)
    console.log("Room Id : ", this.roomId)

    this.storageArray = this.chatAppService.getStorage();
    const storageIndex = this.storageArray.findIndex(
      (storage: any) => storage.roomId === this.roomId
    );

    if (storageIndex > -1) {
      this.messageArray = this.storageArray[storageIndex].chats;
    }

    this.join(this.currentUser.name, this.roomId);
  }

  join(userName: string, roomId: string): void {
    const data = `user: ${userName}, room: ${roomId}`;
    //const data: any = { user: userName, room: roomId };
    this.chatAppService.userConnect(data);
  }

  sendMessage(): void {
    //const data = `${this.currentUser.name} (${this.roomId}): ${this.messageText}`;
     const data = `${this.currentUser.name} : ${this.messageText}`;
    // const data: any = {
    //   user: this.currentUser.name,
    //   room: this.roomId,
    //   message: this.messageText,
    // };
    this.chatAppService.sendMessage(data);
    console.log('message :', data);

    this.storageArray = this.chatAppService.getStorage();
    const storageIndex = this.storageArray.findIndex(
      (storage: any) => storage.roomId === this.roomId
    );

    console.log('Get storage :', this.storageArray);
    console.log('Local storage :', storageIndex);

    if (storageIndex > -1) {
      this.storageArray[storageIndex].chats.push({
        user: this.currentUser.name,
        message: this.messageText,
      });
    } else {
      const updateStorage = {
        roomId: this.roomId,
        chats: [
          {
            user: this.currentUser.name,
            message: this.messageText,
          },
        ],
      };
      this.storageArray.push(updateStorage);
      console.log("update Storage : ", updateStorage)
    }
    this.chatAppService.setStorage(this.storageArray);
    this.messageText = '';
  }
}
