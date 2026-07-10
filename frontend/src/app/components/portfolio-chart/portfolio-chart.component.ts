import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface PortfolioDataPoint {
  date: string;
  value: number;
}

interface ScrubState {
  value: number;
  date: string;
}

// Fixed SVG coordinate space — preserveAspectRatio="none" stretches to fit the DOM container.
const SVG_W = 1000;
const SVG_H = 170;

@Component({
  selector: 'app-portfolio-chart',
  templateUrl: './portfolio-chart.component.html',
  styleUrls: ['./portfolio-chart.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class PortfolioChartComponent implements OnChanges {
  @Input() data: PortfolioDataPoint[] = [];
  @Input() selectedPeriod: string = '1M';
  @Output() scrubChange = new EventEmitter<ScrubState | null>();

  @ViewChild('chartBox') chartBoxRef!: ElementRef<HTMLDivElement>;

  readonly svgW = SVG_W;
  readonly svgH = SVG_H;

  // Ghost state (no data yet): an example compounding curve in viewBox coords.
  readonly ghostLinePath =
    'M0,158 C120,155 220,146 330,132 C440,118 520,104 620,86 C720,68 850,44 1000,22';
  readonly ghostAreaPath =
    `M0,158 C120,155 220,146 330,132 C440,118 520,104 620,86 C720,68 850,44 1000,22 L${SVG_W},${SVG_H} L0,${SVG_H} Z`;

  linePath = '';
  areaPath = '';
  hairlineX: number | null = null;
  dotCx: number | null = null;
  dotCy: number | null = null;

  private isScrubbing = false;
  private _yMin = 0;
  private _yMax = 1;
  private _pad = 0.08;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] || changes['selectedPeriod']) {
      this.renderPaths();
    }
  }

  private renderPaths(): void {
    if (!this.data || this.data.length === 0) {
      this.linePath = '';
      this.areaPath = '';
      return;
    }

    const values = this.data.map(p => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const pad = (max - min) * 0.08 || 1;

    this._yMin = min;
    this._yMax = max;
    this._pad = pad;

    const scaleY = (v: number) =>
      SVG_H - 6 - ((v - min + pad) / (max - min + pad * 2)) * (SVG_H - 12);

    const scaleX = (i: number) =>
      this.data.length <= 1 ? SVG_W / 2 : (i / (this.data.length - 1)) * SVG_W;

    let line = '';
    let area = `M0,${SVG_H} `;

    for (let i = 0; i < this.data.length; i++) {
      const px = scaleX(i).toFixed(1);
      const py = scaleY(this.data[i].value).toFixed(1);
      line += (i === 0 ? 'M' : 'L') + px + ',' + py + ' ';
      area += `L${px},${py} `;
    }

    area += `L${SVG_W},${SVG_H} Z`;

    this.linePath = line.trim();
    this.areaPath = area.trim();
  }

  onPointerDown(event: PointerEvent): void {
    try {
      (event.currentTarget as Element).setPointerCapture(event.pointerId);
    } catch (_) {
      // setPointerCapture may fail in some environments; scrubbing still works via pointermove
    }
    this.isScrubbing = true;
    this.scrub(event);
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.isScrubbing || event.buttons === 0) return;
    this.scrub(event);
  }

  onPointerUp(): void {
    this.endScrub();
  }

  onPointerCancel(): void {
    this.endScrub();
  }

  private scrub(event: PointerEvent): void {
    if (!this.data || this.data.length === 0) return;

    const box = this.chartBoxRef?.nativeElement;
    if (!box) return;

    const rect = box.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const i = Math.round(frac * (this.data.length - 1));
    const point = this.data[i];
    if (!point) return;

    const min = this._yMin;
    const max = this._yMax;
    const pad = this._pad;
    const scaleY = (v: number) =>
      SVG_H - 6 - ((v - min + pad) / (max - min + pad * 2)) * (SVG_H - 12);

    const px = this.data.length <= 1 ? SVG_W / 2 : (i / (this.data.length - 1)) * SVG_W;
    const py = scaleY(point.value);

    this.hairlineX = px;
    this.dotCx = px;
    this.dotCy = py;

    const weekdayDate = new Date(point.date + (point.date.includes('T') ? '' : 'T00:00:00Z'))
      .toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC'
      });

    this.scrubChange.emit({ value: point.value, date: weekdayDate });
  }

  private endScrub(): void {
    this.isScrubbing = false;
    this.hairlineX = null;
    this.dotCx = null;
    this.dotCy = null;
    this.scrubChange.emit(null);
  }
}
