import * as os from 'os';

const cluster = require('cluster');

export class ClusterManager {
  private workers: any[] = [];
  private readonly numCPUs: number;

  constructor() {
    this.numCPUs = os.cpus().length;
  }

  public start(): void {
    if (cluster.isPrimary) {
      this.startPrimary();
    } else {
      this.startWorker();
    }
  }

  private startPrimary(): void {
    console.log(`🚀 Primary process ${process.pid} starting...`);
    console.log(`📊 Forking ${this.numCPUs} worker processes for optimal performance`);

    // Fork workers
    for (let i = 0; i < this.numCPUs; i++) {
      const worker = cluster.fork();
      this.workers.push(worker);
    }

    // Monitor worker health
    cluster.on('exit', (worker, code, signal) => {
      console.log(`⚠️  Worker ${worker.process.pid} died (${signal || code})`);
      
      // Remove dead worker from array
      const index = this.workers.findIndex(w => w.id === worker.id);
      if (index > -1) {
        this.workers.splice(index, 1);
      }
      
      // Replace the dead worker
      console.log(`🔄 Spawning replacement worker...`);
      const newWorker = cluster.fork();
      this.workers.push(newWorker);
    });

    cluster.on('online', (worker) => {
      console.log(`✅ Worker ${worker.process.pid} is online and ready`);
    });

    // Graceful shutdown handling
    this.setupGracefulShutdown();

    // Monitor memory usage
    this.startMemoryMonitoring();
  }

  private startWorker(): void {
    console.log(`👷 Worker ${process.pid} starting...`);
    
    // Handle shutdown signal from primary
    process.on('message', (msg) => {
      if (msg === 'shutdown') {
        console.log(`🛑 Worker ${process.pid} shutting down gracefully...`);
        process.exit(0);
      }
    });
  }

  private setupGracefulShutdown(): void {
    const gracefulShutdown = (signal: string) => {
      console.log(`🛑 Received ${signal}, shutting down gracefully...`);
      this.workers.forEach(worker => {
        worker.send('shutdown');
      });
      
      setTimeout(() => {
        console.log('💀 Force killing remaining workers...');
        process.exit(0);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  }

  private startMemoryMonitoring(): void {
    setInterval(() => {
      const memUsage = process.memoryUsage();
      console.log(`📈 Memory usage: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB / ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`);
    }, 30000);
  }
}
