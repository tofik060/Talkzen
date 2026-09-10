import { Component, OnInit } from '@angular/core';
import { ChatAppService } from './services/chat-app.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  title = 'Talkzen';

  constructor(private chatAppService: ChatAppService) {}

  ngOnInit(): void {
    this.chatAppService.wakeApi();
  }
}
