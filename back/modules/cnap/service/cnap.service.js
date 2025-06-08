const cnapRepository = require('../repository/cnap.repository')
const Logger = require('../../../utils/logger')
const { addRequisiteToAdminServiceDebt} = require("../../../utils/function")
const logRepository = require("../../log/repository/log-repository");

class CnapService {
    async getServices(filter) {
        try {
            return await cnapRepository.getServices(filter)
        } catch (error) {
            Logger.error('Error in getServices:', error)
            throw error
        }
    }

    async getServiceById(id) {
        try {
            const service = await cnapRepository.getServiceById(id)
            if (!service) {
                const error = new Error('Service not found')
                error.statusCode = 404
                throw error
            }
            return service
        } catch (error) {
            Logger.error('Error in getServiceById:', error)
            throw error
        }
    }

    async createService(serviceData) {
        try {
            // Валідація даних
            if (!serviceData.identifier || !serviceData.name || !serviceData.price || !serviceData.edrpou || !serviceData.iban) {
                const error = new Error('Всі поля є обов\'язковими')
                error.statusCode = 400
                throw error
            }

            // Валідація ЄДРПОУ (має бути 8 цифр)
            if (!/^\d{8}$/.test(serviceData.edrpou)) {
                const error = new Error('ЄДРПОУ має містити 8 цифр')
                error.statusCode = 400
                throw error
            }

            // Валідація IBAN (має бути 29 символів)
            if (!/^[A-Z]{2}[0-9]{27}$/.test(serviceData.iban)) {
                const error = new Error('IBAN має бути у форматі UA + 27 цифр')
                error.statusCode = 400
                throw error
            }

            // Валідація ціни (має бути додатнім числом)
            if (serviceData.price <= 0) {
                const error = new Error('Ціна має бути більше 0')
                error.statusCode = 400
                throw error
            }

            Logger.info('createService data:', serviceData)
            const result = await cnapRepository.createService(serviceData)
            Logger.info('createService result:', result)
            
            return { 
                message: 'Послугу успішно створено', 
                id: result.id,
                identifier: result.identifier,
                name: result.name
            }
        } catch (error) {
            Logger.error('Error in createService:', error)
            throw error
        }
    }

    async updateService(id, serviceData) {
        try {
            const service = await cnapRepository.getServiceById(id)
            if (!service) {
                const error = new Error('Service not found')
                error.statusCode = 404
                throw error
            }
            return await cnapRepository.updateService(id, serviceData)
        } catch (error) {
            Logger.error('Error in updateService:', error)
            throw error
        }
    }

    async getAccounts(filter) {
        try {
            return await cnapRepository.getAccounts(filter)
        } catch (error) {
            Logger.error('Error in getAccounts:', error)
            throw error
        }
    }

    async getAccountById(id) {
        try {
            const account = await cnapRepository.getAccountById(id)
            if (!account) {
                const error = new Error('Account not found')
                error.statusCode = 404
                throw error
            }
            return account
        } catch (error) {
            Logger.error('Error in getAccountById:', error)
            throw error
        }
    }

    async deleteService(id) {
        try {
            const service = await cnapRepository.getServiceById(id)
            if (!service) {
                const error = new Error('Service not found')
                error.statusCode = 404
                throw error
            }
            
            await cnapRepository.deleteService(id)
            return { message: 'Послугу успішно видалено' }
        } catch (error) {
            Logger.error('Error in deleteService:', error)
            throw error
        }
    }

    async createAccount(accountData) {
        try {
            // Перевірка чи існує послуга
            const service = await cnapRepository.getServiceByIdentifier(accountData.service_code)
            if (!service) {
                const error = new Error('Service not found')
                error.statusCode = 404
                throw error
            }

            // Перевірка чи номер рахунку унікальний
            const existingAccount = await cnapRepository.getAccountByNumber(accountData.account_number)
            if (existingAccount) {
                const error = new Error('Account number already exists')
                error.statusCode = 400
                throw error
            }

            return await cnapRepository.createAccount(accountData)
        } catch (error) {
            Logger.error('Error in createAccount:', error)
            throw error
        }
    }
async printDebtId(request, reply) {
    // Перевіряємо наявність ID рахунку
    if (!request?.params?.id) {
        throw new Error("Немає ID рахунку для отримання даних");
    }

    // Отримуємо дані по рахунку за його ID
    const fetchAccount = await cnapRepository.getAccountById(request?.params?.id);
    if (!fetchAccount) {
        throw new Error(NotFoundErrorMessage); // Якщо рахунок не знайдений
    }

    // Отримуємо реквізити для адміністративної послуги
    const fetchRequisite = await cnapRepository.getServiceByIdentifier(fetchAccount.service_code);
    if (!fetchRequisite) {
        throw new Error(NotFoundErrorMessage); // Якщо реквізити не знайдені
    }

    // Якщо є борг по рахунку
    if (fetchAccount.amount > 0) {
        const result = await addRequisiteToAdminServiceDebt(fetchAccount, fetchRequisite);
        
        // Логування дії
        await logRepository.createLog({
            row_pk_id: fetchAccount.id,
            uid: request?.user?.id,
            action: 'PRINT',
            client_addr: request?.ip,
            application_name: 'Друк документа',
            action_stamp_tx: new Date(),
            action_stamp_stm: new Date(),
            action_stamp_clk: new Date(),
            schema_name: 'ower',
            table_name: 'ower',
            oid: '16504',
        });

        return reply.send({
            name: fetchAccount.payer, // Повертатимемо ім'я платника
            date: fetchAccount.date,
            accountNumber: fetchAccount.account_number, // Рахунок
            debt: result // Реквізити для адміністративної послуги
        });
    }

    throw new Error("Немає даних для формування документу.");
}

}

module.exports = new CnapService()
