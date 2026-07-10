import {
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartType } from 'chart.js';

/** Shape FRED emits inside ```chart fenced blocks (see FredConstitution) */
export interface ChatChartConfig {
  type?: string; // line | bar | doughnut | pie
  title?: string;
  labels: string[];
  datasets: { label?: string; data: number[] }[];
}

const FRED_PALETTE = ['#2563eb', '#059669', '#f59e0b', '#dc2626', '#7c3aed', '#0891b2'];

@Component({
  selector: 'app-chat-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chat-chart">
      <p class="chat-chart-title" *ngIf="config?.title">{{ config?.title }}</p>
      <div class="chat-chart-canvas-wrap">
        <canvas #canvas></canvas>
      </div>
    </div>
  `,
  styles: [
    `
      .chat-chart {
        margin: 10px 0;
      }
      .chat-chart-title {
        font-size: 13px;
        font-weight: 600;
        color: var(--app-gray-900, #111827);
        margin: 0 0 6px;
      }
      .chat-chart-canvas-wrap {
        position: relative;
        height: 220px;
        width: 100%;
      }
    `,
  ],
})
export class ChatChartComponent implements OnChanges, OnDestroy {
  @ViewChild('canvas') set canvasRef(el: ElementRef<HTMLCanvasElement> | undefined) {
    this._canvas = el;
    if (el && !this.chart) {
      this.pendingRender = setTimeout(() => this.render(), 0);
    }
  }
  private _canvas: ElementRef<HTMLCanvasElement> | undefined;

  @Input() config: ChatChartConfig | null = null;

  private chart: Chart | null = null;
  private renderedJson = '';
  private pendingRender: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['config']) {
      // Streaming re-parses segments per token — only rebuild on real change
      const json = JSON.stringify(this.config ?? {});
      if (json !== this.renderedJson) {
        this.render();
      }
    }
  }

  ngOnDestroy() {
    this.destroyed = true;
    if (this.pendingRender) clearTimeout(this.pendingRender);
    this.chart?.destroy();
    this.chart = null;
  }

  private render() {
    if (this.destroyed || !this._canvas || !this.config?.labels || !this.config?.datasets) return;

    this.chart?.destroy();
    this.renderedJson = JSON.stringify(this.config);

    const type = (['line', 'bar', 'doughnut', 'pie'].includes(this.config.type ?? '')
      ? this.config.type
      : 'line') as ChartType;
    const circular = type === 'doughnut' || type === 'pie';

    const datasets = this.config.datasets.map((ds, i) => ({
      label: ds.label,
      data: ds.data,
      borderColor: circular ? '#ffffff' : FRED_PALETTE[i % FRED_PALETTE.length],
      backgroundColor: circular
        ? ds.data.map((_, j) => FRED_PALETTE[j % FRED_PALETTE.length])
        : type === 'bar'
          ? FRED_PALETTE[i % FRED_PALETTE.length]
          : `${FRED_PALETTE[i % FRED_PALETTE.length]}1f`,
      borderWidth: 2,
      tension: 0.3,
      fill: type === 'line' && this.config!.datasets.length === 1,
      pointRadius: 0,
    }));

    this.chart = new Chart(this._canvas.nativeElement, {
      type,
      data: { labels: this.config.labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: circular || this.config.datasets.length > 1,
            position: 'bottom',
            labels: { boxWidth: 10, font: { size: 11 } },
          },
        },
        scales: circular
          ? undefined
          : {
              x: { grid: { display: false }, ticks: { font: { size: 10 }, maxTicksLimit: 8 } },
              y: { grid: { color: 'rgba(17, 24, 39, 0.06)' }, ticks: { font: { size: 10 } } },
            },
      },
    });
  }
}
