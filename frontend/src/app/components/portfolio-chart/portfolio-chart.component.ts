import { Component, Input, OnInit, OnDestroy, ViewChild, ElementRef, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  Chart, 
  ChartConfiguration, 
  ChartData, 
  registerables,
  TooltipItem 
} from 'chart.js';

export interface PortfolioDataPoint {
  date: string;
  value: number;
}

@Component({
  selector: 'app-portfolio-chart',
  templateUrl: './portfolio-chart.component.html',
  styleUrls: ['./portfolio-chart.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class PortfolioChartComponent implements OnInit, OnDestroy, OnChanges {
  @ViewChild('chartCanvas', { static: true }) chartCanvas!: ElementRef<HTMLCanvasElement>;
  @Input() data: PortfolioDataPoint[] = [];
  @Input() selectedPeriod: string = '1M';
  
  private chart: Chart | null = null;
  public selectedDataPoint: { date: string; value: number; formattedDate: string } | null = null;
  public tooltipPosition: { x: number; y: number } = { x: 0, y: 0 };

  ngOnInit() {
    // Chart.js is now registered globally in main.ts
    this.initializeChart();
  }

  ngOnDestroy() {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['data'] || changes['selectedPeriod']) {
      this.updateChart();
    }
  }

  private initializeChart() {
    // Don't initialize if no data
    if (!this.data || this.data.length === 0) {
      return;
    }

    // Destroy existing chart before creating new one
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }

    const ctx = this.chartCanvas?.nativeElement?.getContext('2d');
    if (!ctx) {
      console.warn('Chart canvas context not available');
      return;
    }

    // Clear any existing chart from the canvas
    Chart.getChart(this.chartCanvas.nativeElement)?.destroy();

    try {
      const chartData: ChartData<'line'> = {
      labels: this.data.map(point => {
        const date = new Date(point.date);
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
      }),
      datasets: [{
        label: 'Portfolio Value',
        data: this.data.map(point => point.value),
        borderColor: '#3880ff',
        backgroundColor: 'rgba(56, 128, 255, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 8,
        pointHoverBackgroundColor: '#3880ff',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 2
      }]
    };

    // Store reference to component data for use in callbacks
    const componentData = this.data;

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index'
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            enabled: false, // We'll use custom tooltip
            external: (context) => {
              this.handleTooltip(context);
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              color: '#666',
              maxTicksLimit: 6
            }
          },
          y: {
            beginAtZero: false,
            grid: {
              color: 'rgba(200, 200, 200, 0.3)'
            },
            ticks: {
              color: '#666',
              callback: function(value) {
                return '$' + Number(value).toLocaleString('en-US', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                });
              }
            }
          }
        },
        onHover: (event, elements) => {
          const canvas = event.native?.target as HTMLCanvasElement;
          if (canvas) {
            canvas.style.cursor = elements.length > 0 ? 'pointer' : 'default';
          }
        },
        onClick: (event, elements) => {
          if (elements.length > 0) {
            const elementIndex = elements[0].index;
            const dataPoint = this.data[elementIndex];
            const element = elements[0];
            
            if (dataPoint && this.chart) {
              this.selectedDataPoint = {
                date: dataPoint.date,
                value: dataPoint.value,
                formattedDate: this.formatDate(dataPoint.date)
              };
              
              // Get the x position from the chart element (this is already centered on the point)
              const pointX = element.element.x;
              const pointY = element.element.y;
              
              // Position tooltip centered above the point
              // pointX is already the center of the dot, so we just need to offset by half the tooltip width
              this.tooltipPosition = {
                x: pointX - 50, // Center the tooltip (assuming ~100px width)
                y: pointY - 80  // Position above the point
              };
            }
          } else {
            // Clear selection if clicking outside a point
            this.selectedDataPoint = null;
          }
        }
      }
    };

    this.chart = new Chart(ctx, config);
    } catch (error) {
      console.error('Error initializing chart:', error);
    }
  }

  private updateChart() {
    if (!this.data || this.data.length === 0) {
      return;
    }

    if (!this.chart) {
      this.initializeChart();
      return;
    }

    try {
      this.chart.data.labels = this.data.map(point => {
        const date = new Date(point.date);
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
      });
      this.chart.data.datasets[0].data = this.data.map(point => point.value);

      this.chart.update('none');
    } catch (error) {
      console.error('Error updating chart:', error);
    }
  }

  private handleTooltip(context: any) {
    // We're now using click-to-show instead of hover tooltips
    // This method can be simplified or removed
    return;
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'long' });
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: diffDays > 365 ? 'numeric' : undefined
      });
    }
  }

  public formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }
}
