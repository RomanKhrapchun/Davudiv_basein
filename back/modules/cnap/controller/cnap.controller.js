const cnapService = require('../service/cnap.service')
const Logger = require('../../../utils/logger')

class CnapController {
    async getServices(request, reply) {
        try {
            const filter = request.body
            const result = await cnapService.getServices(filter)
            return reply.send(result)
        } catch (error) {
            Logger.error('Error in getServices:', error)
            return reply.status(500).send({ message: error.message })
        }
    }

    async getServiceById(request, reply) {
        try {
            const { id } = request.params
            const result = await cnapService.getServiceById(id)
            return reply.send(result)
        } catch (error) {
            Logger.error('Error in getServiceById:', error)
            return reply.status(500).send({ message: error.message })
        }
    }

    async createService(request, reply) {
        try {
            const serviceData = request.body
            const result = await cnapService.createService(serviceData)
            return reply.send(result)
        } catch (error) {
            Logger.error('Error in createService:', error)
            return reply.status(500).send({ message: error.message })
        }
    }

    async updateService(request, reply) {
        try {
            const { id } = request.params
            const serviceData = request.body

            const updatedService = await cnapService.updateService(id, serviceData)
            return reply.send(updatedService)
        } catch (error) {
            Logger.error('Error in updateService:', error)
            if (error.statusCode) {
                return reply.status(error.statusCode).send({ message: error.message })
            }
            return reply.status(500).send({ message: error.message })
        }
    }

    async getAccounts(request, reply) {
        try {
            const filter = request.body
            const result = await cnapService.getAccounts(filter)
            return reply.send(result)
        } catch (error) {
            Logger.error('Error in getAccounts:', error)
            return reply.status(500).send({ message: error.message })
        }
    }

    async getAccountById(request, reply) {
        try {
            const { id } = request.params
            const result = await cnapService.getAccountById(id)
            return reply.send(result)
        } catch (error) {
            Logger.error('Error in getAccountById:', error)
            return reply.status(500).send({ message: error.message })
        }
    }

    async createAccount(request, reply) {
        try {
            const accountData = request.body
            const result = await cnapService.createAccount(accountData)
            return reply.send(result)
        } catch (error) {
            Logger.error('Error in createAccount:', error)
            return reply.status(500).send({ message: error.message })
        }
    }

    async deleteService(request, reply) {
        try {
            const { id } = request.params
            const result = await cnapService.deleteService(id)
            return reply.send(result)
        } catch (error) {
            Logger.error('Error in deleteService:', error)
            if (error.statusCode) {
                return reply.status(error.statusCode).send({ message: error.message })
            }
            return reply.status(500).send({ message: error.message })
        }
    }
    async printDebtId(request, reply) {
        try {
            const result = await cnapService.printDebtId(request, reply)
            return reply.send(result)
        } catch (error) {
            Logger.error(error.message, { stack: error.stack })
            reply.status(400).send(error)
        }
    }
}

module.exports = new CnapController()
