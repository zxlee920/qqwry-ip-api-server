const { CronJob } = require('cron');
const QQWryReader = require('./qqwry-reader.js');
const logger = require('./logger');

/**
 * 定时任务调度器
 * 负责管理定时更新IP库等任务
 */
class Scheduler {
    constructor() {
        this.jobs = {};
        this.qqwryReader = null;
    }

    /**
     * 初始化调度器
     * @param {QQWryReader} qqwryReader 纯真IP库读取器实例
     */
    initialize(qqwryReader) {
        this.qqwryReader = qqwryReader;
        logger.info('🕒 初始化定时任务调度器');
    }

    /**
     * 启动IP库更新定时任务
     * @param {string} cronExpression cron表达式，默认每天凌晨2点
     */
    startDatabaseUpdateJob(cronExpression = '0 2 * * *') {
        if (!this.qqwryReader) {
            logger.error('无法启动IP库更新任务：QQWryReader未初始化');
            return false;
        }

        try {
            // 停止已存在的任务
            if (this.jobs.dbUpdate) {
                this.jobs.dbUpdate.stop();
            }

            // 创建新任务
            this.jobs.dbUpdate = new CronJob(
                cronExpression,
                async () => {
                    logger.info('🔄 执行定时IP库更新任务');
                    try {
                        // 检查是否需要更新
                        const needsUpdate = await this.qqwryReader.needsUpdate();
                        if (!needsUpdate) {
                            logger.info('✅ IP库已是最新版本，无需更新');
                            return;
                        }

                        // 执行更新
                        logger.info('📥 开始更新IP库...');
                        await this.qqwryReader.updateDatabase();
                        logger.info(`✅ IP库更新成功，版本: ${this.qqwryReader.getVersion()}`);
                    } catch (error) {
                        logger.error('❌ IP库定时更新失败', error);
                    }
                },
                null, // onComplete
                true, // start
                'Asia/Shanghai' // 时区
            );

            logger.info(`🕒 IP库更新定时任务已启动，执行计划: ${cronExpression}`);
            return true;
        } catch (error) {
            logger.error('启动IP库更新定时任务失败', error);
            return false;
        }
    }

    /**
     * 启动日志清理定时任务
     * @param {string} cronExpression cron表达式，默认每周一凌晨3点
     */
    startLogCleanupJob(cronExpression = '0 3 * * 1') {
        try {
            // 停止已存在的任务
            if (this.jobs.logCleanup) {
                this.jobs.logCleanup.stop();
            }

            // 创建新任务
            this.jobs.logCleanup = new CronJob(
                cronExpression,
                async () => {
                    logger.info('🧹 执行日志清理任务');
                    try {
                        await logger.cleanOldLogs();
                        logger.info('✅ 日志清理完成');
                    } catch (error) {
                        logger.error('❌ 日志清理失败', error);
                    }
                },
                null, // onComplete
                true, // start
                'Asia/Shanghai' // 时区
            );

            logger.info(`🕒 日志清理定时任务已启动，执行计划: ${cronExpression}`);
            return true;
        } catch (error) {
            logger.error('启动日志清理定时任务失败', error);
            return false;
        }
    }

    /**
     * 启动所有定时任务
     */
    startAllJobs() {
        this.startDatabaseUpdateJob();
        this.startLogCleanupJob();
        logger.info('✅ 所有定时任务已启动');
    }

    /**
     * 停止所有定时任务
     */
    stopAllJobs() {
        Object.values(this.jobs).forEach(job => {
            if (job && job.running) {
                job.stop();
            }
        });
        logger.info('⏹️ 所有定时任务已停止');
    }

    /**
     * 获取所有任务状态
     * @returns {Object} 任务状态
     */
    getJobsStatus() {
        const status = {};
        
        for (const [name, job] of Object.entries(this.jobs)) {
            status[name] = {
                running: job ? job.running : false,
                cronTime: job ? job.cronTime.source : null,
                nextDate: job && job.running ? job.nextDate().toISOString() : null
            };
        }
        
        return status;
    }
}

// 创建单例
const scheduler = new Scheduler();

module.exports = scheduler;