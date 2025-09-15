import * as os from 'os';

const cluster = require('cluster');

export class ClusterManager {
  private workers: any[] = [];
  private readonly numCPUs: number;

  constructor() {
    // Используем все доступные CPU ядра для максимальной производительности
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

    // Настройки для высоких нагрузок
    process.setMaxListeners(0);
    
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
    
    // Monitor worker performance
    this.startPerformanceMonitoring();
  }

  private startWorker(): void {
    console.log(`👷 Worker ${process.pid} starting...`);
    
    // Оптимизации для воркера
    process.setMaxListeners(0);
    
    // Handle shutdown signal from primary
    process.on('message', (msg) => {
      if (msg === 'shutdown') {
        console.log(`🛑 Worker ${process.pid} shutting down gracefully...`);
        process.exit(0);
      }
    });
    
    // Обработка необработанных ошибок
    process.on('uncaughtException', (error) => {
      console.error(`❌ Uncaught Exception in worker ${process.pid}:`, error);
      process.exit(1);
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error(`❌ Unhandled Rejection in worker ${process.pid}:`, reason);
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
      const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
      const rssMB = Math.round(memUsage.rss / 1024 / 1024);
      
      console.log(`📈 Memory usage: ${heapUsedMB}MB heap / ${heapTotalMB}MB total / ${rssMB}MB RSS`);
      
      // Предупреждение при высоком использовании памяти
      if (heapUsedMB > 500) {
        console.warn(`⚠️  High memory usage detected: ${heapUsedMB}MB`);
      }
    }, 30000);
  }
  
  private startPerformanceMonitoring(): void {
    setInterval(() => {
      const activeWorkers = this.workers.filter(w => !w.isDead());
      console.log(`📊 Active workers: ${activeWorkers.length}/${this.numCPUs}`);
      
      // Проверяем нагрузку на CPU
      const cpuUsage = process.cpuUsage();
      console.log(`🖥️  CPU usage: ${Math.round(cpuUsage.user / 1000)}ms user, ${Math.round(cpuUsage.system / 1000)}ms system`);
    }, 60000);
  }
}
