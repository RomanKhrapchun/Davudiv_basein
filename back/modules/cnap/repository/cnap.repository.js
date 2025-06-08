const { sqlRequest } = require('../../../helpers/database')
const Logger = require('../../../utils/logger')

class CnapRepository {
    async getServices(filter) {
        const offset = (filter.page - 1) * filter.limit
        const searchCondition = filter.search ? `AND (name ILIKE '%${filter.search}%' OR identifier ILIKE '%${filter.search}%')` : ''
        
        const query = `
            SELECT id, identifier, name, price, edrpou, iban, create_date
            FROM admin.cnap_services
            WHERE enabled = true ${searchCondition}
            ORDER BY create_date DESC
            LIMIT $1 OFFSET $2
        `
        const countQuery = `
            SELECT COUNT(*) as total
            FROM admin.cnap_services
            WHERE enabled = true ${searchCondition}
        `
        
        const [items, count] = await Promise.all([
            sqlRequest(query, [filter.limit, offset]),
            sqlRequest(countQuery)
        ])
        
        return {
            items,
            totalItems: parseInt(count[0].total)
        }
    }

    async getServiceById(id) {
        const query = `
            SELECT id, identifier, name, price, edrpou, iban, create_date
            FROM admin.cnap_services
            WHERE id = $1 AND enabled = true
        `
        const result = await sqlRequest(query, [id])
        return result[0]
    }

    async getServiceByIdentifier(identifier) {
        const query = `
            SELECT id, identifier, name, price, edrpou, iban, create_date
            FROM admin.cnap_services
            WHERE identifier = $1 AND enabled = true
        `
        const result = await sqlRequest(query, [identifier])
        return result[0]
    }

    async createService(serviceData) {
        const query = `
            WITH inserted AS (
                INSERT INTO admin.cnap_services 
                    (identifier, name, price, edrpou, iban, enabled)
                VALUES 
                    ($1, $2, $3::decimal, $4, $5, true)
                RETURNING id, identifier, name
            )
            SELECT id, identifier, name FROM inserted;
        `
        const params = [
            serviceData.identifier,
            serviceData.name,
            serviceData.price,
            serviceData.edrpou,
            serviceData.iban
        ]
        
        Logger.info('createService query:', { query, params })
        const result = await sqlRequest(query, params)
        return result[0]
    }

    async updateService(id, serviceData) {
        const { identifier, name, price, edrpou, iban } = serviceData
        const query = `
            UPDATE admin.cnap_services 
            SET identifier = $1, 
                name = $2, 
                price = $3::decimal, 
                edrpou = $4, 
                iban = $5,
                update_date = NOW()
            WHERE id = $6 
            RETURNING id, identifier, name, price, edrpou, iban, create_date, update_date
        `
        const params = [identifier, name, price, edrpou, iban, id]
        
        const result = await sqlRequest(query, params)
        if (!result.length) {
            const error = new Error('Service not found')
            error.statusCode = 404
            throw error
        }
        return result[0]
    }

    async deleteService(id) {
        const query = `
            UPDATE admin.cnap_services 
            SET enabled = false,
                update_date = NOW()
            WHERE id = $1 AND enabled = true
            RETURNING id
        `
        const result = await sqlRequest(query, [id])
        if (!result.length) {
            const error = new Error('Service not found')
            error.statusCode = 404
            throw error
        }
        return result[0]
    }

    async getAccounts(filter) {
        const offset = (filter.page - 1) * filter.limit
        const searchCondition = filter.search ? `AND (a.account_number ILIKE '%${filter.search}%' OR a.payer ILIKE '%${filter.search}%')` : ''
        
        const query = `
            SELECT 
                a.id,
                a.account_number,
                a.date,
                a.time,
                s.name as service_name,
                s.identifier as service_code,
                a.administrator,
                a.payer,
                a.amount,
                a.create_date
            FROM admin.cnap_accounts a
            JOIN admin.cnap_services s ON s.identifier = a.service_id
            WHERE a.enabled = true ${searchCondition}
            ORDER BY a.create_date DESC
            LIMIT $1 OFFSET $2
        `
        const countQuery = `
            SELECT COUNT(*) as total
            FROM admin.cnap_accounts a
            WHERE a.enabled = true ${searchCondition}
        `
        
        const [items, count] = await Promise.all([
            sqlRequest(query, [filter.limit, offset]),
            sqlRequest(countQuery)
        ])
        
        return {
            items,
            totalItems: parseInt(count[0].total)
        }
    }

    async getAccountById(id) {
        const query = `
            SELECT 
                a.id,
                a.account_number,
                a.date,
                a.time,
                s.name as service_name,
                s.identifier as service_code,
                a.administrator,
                a.payer,
                a.amount,
                a.create_date
            FROM admin.cnap_accounts a
            JOIN admin.cnap_services s ON s.identifier = a.service_id
            WHERE a.id = $1 AND a.enabled = true
        `
        const result = await sqlRequest(query, [id])
        return result[0]
    }

    async getAccountByNumber(accountNumber) {
        const query = `
            SELECT a.*, s.name as service_name
            FROM admin.cnap_accounts a
            LEFT JOIN admin.cnap_services s ON s.identifier = a.service_id
            WHERE a.account_number = $1 AND a.enabled = true
        `
        const result = await sqlRequest(query, [accountNumber])
        return result[0]
    }

    async createAccount(accountData) {
        const { account_number, service_code, administrator, payer, amount, time } = accountData
        const query = `
            INSERT INTO admin.cnap_accounts (
                account_number, service_id, administrator, 
                date, time, payer, amount
            )
            VALUES (
                $1, $2, $3, 
                CURRENT_DATE, $6::time, $4, $5::decimal
            )
            RETURNING 
                id, account_number, service_id, administrator,
                date, time, payer, amount, create_date
        `
        const params = [account_number, service_code, administrator, payer, amount, time]
        
        const result = await sqlRequest(query, params)
        return result[0]
    }
}

module.exports = new CnapRepository()
