import {
  Component,
  EventEmitter,
  Input,
  Output,
  computed,
  signal,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  pieChartOutline,
  trendingUpOutline,
  chatbubblesOutline,
  personOutline,
} from 'ionicons/icons';
import { TabBarScrollService } from '../../services/tab-bar-scroll.service';

interface FloatingTab {
  tab: string;    // route tab name, e.g. 'tab1'
  icon: string;   // ionicon name (outline for now; fill is deferred)
  label: string;  // aria-label
  gated: boolean; // disabled when isSubExpired
}

@Component({
  selector: 'app-floating-tab-bar',
  templateUrl: './floating-tab-bar.component.html',
  styleUrls: ['./floating-tab-bar.component.scss'],
  standalone: true,
  imports: [CommonModule, IonIcon],
})
export class FloatingTabBarComponent {
  private readonly scrollSvc = inject(TabBarScrollService);

  readonly tabs: FloatingTab[] = [
    { tab: 'tab1', icon: 'pie-chart-outline', label: 'Portfolio', gated: true },
    { tab: 'tab2', icon: 'trending-up-outline', label: 'Planning', gated: true },
    { tab: 'chat', icon: 'chatbubbles-outline', label: 'Chat', gated: true },
    { tab: 'tab3', icon: 'person-outline', label: 'Profile', gated: false },
  ];

  @Input() set activeTab(value: string | null | undefined) {
    this._activeTab.set(value ?? 'tab1');
  }
  private readonly _activeTab = signal<string>('tab1');

  @Input() isSubExpired = false;
  @Input() badge: string | null = null;

  @Output() tabSelect = new EventEmitter<string>();

  /** Shrink state from the scroll service. */
  readonly compact = this.scrollSvc.compact;

  /** Index of the active tab (drives the sliding indicator). */
  readonly activeIndex = computed(() => {
    const i = this.tabs.findIndex((t) => t.tab === this._activeTab());
    return i < 0 ? 0 : i;
  });

  constructor() {
    addIcons({
      pieChartOutline,
      trendingUpOutline,
      chatbubblesOutline,
      personOutline,
    });
  }

  isActive(tab: FloatingTab): boolean {
    return tab.tab === this._activeTab();
  }

  isDisabled(tab: FloatingTab): boolean {
    return this.isSubExpired && tab.gated;
  }

  onTap(tab: FloatingTab): void {
    if (this.isDisabled(tab)) {
      return;
    }
    this.tabSelect.emit(tab.tab);
  }
}
