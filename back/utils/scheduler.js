// Створюємо новий файл для планувальника задач
const schedule = require('node-schedule');
const sportsComplexRepository = require('../modules/sportscomplex/repository/sportscomplex-repository');
const logger = require('./logger');

// Запускаємо оновлення абонементів щодня о півночі
const updateSubscriptionsJob = schedule.scheduleJob('0 0 * * *', async () => {
    try {
        logger.info('Starting daily subscription update...');
        await sportsComplexRepository.updateAllSubscriptionDays();
        logger.info('Daily subscription update completed successfully');
    } catch (error) {
        logger.error('Error during daily subscription update:', error);
    }
});

module.exports = {
    updateSubscriptionsJob
};