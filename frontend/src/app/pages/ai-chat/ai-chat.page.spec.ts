import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { MenuController } from '@ionic/angular';
import { AiChatPage } from './ai-chat.page';
import { ChatService } from '../../services/chat.service';
import { FirstTimeTourService } from '../../services/first-time-tour.service';
import { TabActivationService } from '../../services/tab-activation.service';

function makeChatServiceMock() {
  return {
    getSessions: jasmine.createSpy('getSessions').and.returnValue([]),
    getRecentSession: jasmine.createSpy('getRecentSession').and.returnValue({ id: 's0', title: 'New Chat', lastModified: Date.now(), messages: [] }),
    getHistory: jasmine.createSpy('getHistory').and.returnValue(of([])),
    getDailySuggestions: jasmine.createSpy('getDailySuggestions').and.returnValue(of([])),
    getUsedSuggestions: jasmine.createSpy('getUsedSuggestions').and.returnValue([]),
    createSession: jasmine.createSpy('createSession').and.returnValue({ id: 's1', messages: [] }),
    saveSession: jasmine.createSpy('saveSession'),
  };
}

describe('AiChatPage activation gating', () => {
  let chat: ReturnType<typeof makeChatServiceMock>;

  beforeEach(() => {
    chat = makeChatServiceMock();
    TestBed.configureTestingModule({
      imports: [AiChatPage, RouterTestingModule],
      providers: [{ provide: MenuController, useValue: { close: jasmine.createSpy('close'), enable: jasmine.createSpy('enable') } }],
    })
      .overrideProvider(ChatService, { useValue: chat })
      .overrideProvider(FirstTimeTourService, { useValue: { isTourActive: () => false, getCurrentStep: () => 0 } });
  });

  it('does not load chat data until first activation, then gates re-loads', () => {
    const fixture = TestBed.createComponent(AiChatPage);
    const c = fixture.componentInstance;
    // NOTE: no fixture.detectChanges() — keeps ngOnInit (keyboard listeners) from running.

    expect(chat.getDailySuggestions).not.toHaveBeenCalled();
    expect(c.isActive).toBeFalse();

    c.onChatActiveChange(true);
    expect(c.isActive).toBeTrue();
    expect(chat.getSessions).toHaveBeenCalled();
    expect(chat.getDailySuggestions).toHaveBeenCalledTimes(1);

    c.onChatActiveChange(false);
    expect(c.isActive).toBeFalse();

    c.onChatActiveChange(true);
    expect(chat.getDailySuggestions).toHaveBeenCalledTimes(1); // gated — not reloaded
  });
});
