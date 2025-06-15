const sportsComplexRepository = require("../repository/sportscomplex-repository");
const logRepository = require("../../log/repository/log-repository");
const logger = require("../../../utils/logger");
const { paginate, paginationData } = require("../../../utils/function");
const { allowedRequisitesFilterFields, allowedServicesFilterFields, allowedBillsFilterFields, allowedClientsFilterFields, displayRequisitesFilterFields, displayServicesFilterFields, displayBillsFilterFields, displayClientsFilterFields} = require("../../../utils/constants");
const { createRequisiteWord } = require("../../../utils/generateDocx");

class SportsComplexService {
    async findRequisitesByFilter(request) {
        const { page = 1, limit = 16, ...whereConditions } = request.body;
        const { offset } = paginate(page, limit);
        const allowedFields = allowedRequisitesFilterFields.filter(el => whereConditions.hasOwnProperty(el)).reduce((acc, key) => ({ ...acc, [key]: whereConditions[key] }), {});

        const data = await sportsComplexRepository.findRequisitesByFilter(limit, offset, displayRequisitesFilterFields, allowedFields);

        if (Object.keys(whereConditions).length > 0) {
            await logRepository.createLog({
                row_pk_id: null,
                uid: request?.user?.id,
                action: 'SEARCH',
                client_addr: request?.ip,
                application_name: 'Пошук реквізитів',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'sport',
                table_name: 'requisites',
                oid: '16504',
            });
        }

        return paginationData(data[0], page, limit, data[1]);
    }
    
    async findPoolServicesByFilter(request) {
        const { page = 1, limit = 16, ...whereConditions } = request.body;
        const { offset } = paginate(page, limit);
        const allowedFields = allowedServicesFilterFields.filter(el => whereConditions.hasOwnProperty(el)).reduce((acc, key) => ({ ...acc, [key]: whereConditions[key] }), {});

        const data = await sportsComplexRepository.findPoolServicesByFilter(limit, offset, displayServicesFilterFields, allowedFields);

        if (Object.keys(whereConditions).length > 0) {
            await logRepository.createLog({
                row_pk_id: null,
                uid: request?.user?.id,
                action: 'SEARCH',
                client_addr: request?.ip,
                application_name: 'Пошук послуг басейну',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'sport',
                table_name: 'services',
                oid: '16505',
            });
        }

        return paginationData(data[0], page, limit, data[1]);
    }

    async getById(id) {
        try {
            return await sportsComplexRepository.getById(id);
        } catch (error) {
            logger.error("[SportsComplexService][getById]", error);
            throw error;
        }
    }

    async generateWordById(id) {
        try {
            const data = await sportsComplexRepository.getRequisite(id);
            
            await logRepository.createLog({
                row_pk_id: id,
                uid: request?.user?.id,
                action: 'GENERATE_DOC',
                client_addr: request?.ip,
                application_name: 'Генерування документа реквізитів',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'sport',
                table_name: 'requisites',
                oid: '16504',
            });
            
            return await createRequisiteWord(data);
        } catch (error) {
            logger.error("[SportsComplexService][generateWordById]", error);
            throw error;
        }
    }

    async printById(id) {
        try {
            return await sportsComplexRepository.getRequisite(id);
        } catch (error) {
            logger.error("[SportsComplexService][printById]", error);
            throw error;
        }
    }

    // Методи для послуг

    async createPoolService(request) {
        try {
            const { name, lesson_count, price, service_group_id } = request.body;
            const result = await sportsComplexRepository.createPoolService({
                name,
                lesson_count,
                price,
                service_group_id
            });
            
            await logRepository.createLog({
                row_pk_id: result.id,
                uid: request?.user?.id,
                action: 'INSERT',
                client_addr: request?.ip,
                application_name: 'Створення послуги басейну',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'sport',
                table_name: 'services',
                oid: '16505',
            });
            
            return { success: true, message: 'Послугу успішно створено' };
        } catch (error) {
            logger.error("[SportsComplexService][createPoolService]", error);
            throw error;
        }
    }

    async createRequisite(request) {
        try {
            const { kved, iban, edrpou, service_group_id } = request.body;
            const result = await sportsComplexRepository.createRequisite({
                kved,
                iban,
                edrpou,
                service_group_id
            });
            
            await logRepository.createLog({
                row_pk_id: result.id,
                uid: request?.user?.id,
                action: 'INSERT',
                client_addr: request?.ip,
                application_name: 'Створення реквізитів',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'sport',
                table_name: 'requisites',
                oid: '16504',
            });
            
            return { success: true, message: 'Реквізити успішно створено' };
        } catch (error) {
            logger.error("[SportsComplexService][createRequisite]", error);
            throw error;
        }
    }

    async getServiceGroups() {
        try {
            return await sportsComplexRepository.getServiceGroups();
        } catch (error) {
            logger.error("[SportsComplexService][getServiceGroups]", error);
            throw error;
        }
    }

    async getServicesByGroup(id) {
        try {
            return await sportsComplexRepository.getServicesByGroup(id);
        } catch (error) {
            logger.error("[SportsComplexService][getServicesByGroup]", error);
            throw error;
        }
    }

    // Нові методи для клієнтів та рахунків

    async searchClients(request) {
        try {
            const { name } = request.body;
            return await sportsComplexRepository.searchClientsByName(name);
        } catch (error) {
            logger.error("[SportsComplexService][searchClients]", error);
            throw error;
        }
    }

    async createBill(request) {
        try {
            const { membership_number, client_name, phone_number, service_id, discount_type } = request.body;
            
            const result = await sportsComplexRepository.createBillWithDiscount({
                membership_number,
                client_name,
                phone_number,
                service_id,
                discount_type
            });
            
            await logRepository.createLog({
                row_pk_id: result.id,
                uid: request?.user?.id,
                action: 'INSERT',
                client_addr: request?.ip,
                application_name: 'Створення рахунку з пільгою',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'sport',
                table_name: 'payments',
                oid: '16506',
            });
            
            return { 
                success: true, 
                message: 'Рахунок успішно створено',
                id: result.id
            };
        } catch (error) {
            logger.error("[SportsComplexService][createBill]", error);
            throw error;
        }
    }

    async updateBill(request) {
        try {
            const { id } = request.params;
            const { membership_number, client_name, phone_number, service_id, discount_type } = request.body;
            
            const result = await sportsComplexRepository.updateBillWithDiscount(id, {
                membership_number,
                client_name,
                phone_number,
                service_id,
                discount_type
            });
            
            if (!result) {
                throw new Error('Рахунок не знайдено');
            }
            
            await logRepository.createLog({
                row_pk_id: id,
                uid: request?.user?.id,
                action: 'UPDATE',
                client_addr: request?.ip,
                application_name: 'Оновлення рахунку з пільгою',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'sport',
                table_name: 'payments',
                oid: '16506',
            });
            
            return { success: true, message: 'Рахунок успішно оновлено' };
        } catch (error) {
            logger.error("[SportsComplexService][updateBill]", error);
            throw error;
        }
    }

    async findBillsByFilter(request) {
        try {
            const { page = 1, limit = 16, ...whereConditions} = request.body;
            const { offset } = paginate(page, limit);
            
            const allowedFields = allowedBillsFilterFields.filter(el => whereConditions.hasOwnProperty(el)).reduce((acc, key) => ({ ...acc, [key]: whereConditions[key] }), {});

            const data = await sportsComplexRepository.findBillsByFilterWithDiscount(limit, offset, displayBillsFilterFields, allowedFields);
            
            if (Object.keys(whereConditions).length > 0) {
                await logRepository.createLog({
                    row_pk_id: null,
                    uid: request?.user?.id,
                    action: 'SEARCH',
                    client_addr: request?.ip,
                    application_name: 'Пошук рахунків',
                    action_stamp_tx: new Date(),
                    action_stamp_stm: new Date(),
                    action_stamp_clk: new Date(),
                    schema_name: 'sport',
                    table_name: 'payments',
                    oid: '16506',
                });
            }
            
            return paginationData(data[0], page, limit, data[1]);
        } catch (error) {
            logger.error("[SportsComplexService][findBillsByFilter]", error);
            throw error;
        }
    }

    async getBillById(id) {
        try {
            return await sportsComplexRepository.getBillByIdWithDiscount(id);
        } catch (error) {
            logger.error("[SportsComplexService][getBillById]", error);
            throw error;
        }
    }

    async downloadBill(request) {
        try {
            const { id } = request.params;
            
            // Отримуємо дані рахунку
            const bill = await sportsComplexRepository.getBillByIdWithDiscount(id);
            
            if (!bill) {
                throw new Error('Рахунок не знайдено');
            }
            
            // Тут буде логіка генерації PDF файлу
            // Поки що повертаємо заглушку
            const pdfBuffer = Buffer.from('PDF заглушка');
            
            await logRepository.createLog({
                row_pk_id: id,
                uid: request?.user?.id,
                action: 'GENERATE_DOC',
                client_addr: request?.ip,
                application_name: 'Завантаження рахунку',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'sport',
                table_name: 'payments',
                oid: '16506',
            });
            
            return pdfBuffer;
        } catch (error) {
            logger.error("[SportsComplexService][downloadBill]", error);
            throw error;
        }
    }

    async createServiceGroup(request) {
        try {
            const { name } = request.body;
            const result = await sportsComplexRepository.createServiceGroup({ name });
            
            await logRepository.createLog({
                row_pk_id: result.id,
                uid: request?.user?.id,
                action: 'INSERT',
                client_addr: request?.ip,
                application_name: 'Створення групи послуг',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'sport',
                table_name: 'service_groups',
                oid: '16503',
            });
            
            return result;
        } catch (error) {
            logger.error("[SportsComplexService][createServiceGroup]", error);
            throw error;
        }
    }

    async updateRequisite(request) {
        try {
            const { id } = request.params;
            const { kved, iban, edrpou, service_group_id } = request.body;
            
            const result = await sportsComplexRepository.updateRequisite(id, {
                kved,
                iban,
                edrpou,
                service_group_id
            });
            
            if (!result) {
                throw new Error('Реквізити не знайдено');
            }
            
            await logRepository.createLog({
                row_pk_id: id,
                uid: request?.user?.id,
                action: 'UPDATE',
                client_addr: request?.ip,
                application_name: 'Оновлення реквізитів',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'sport',
                table_name: 'requisites',
                oid: '16504',
            });
            
            return { success: true, message: 'Реквізити успішно оновлено' };
        } catch (error) {
            logger.error("[SportsComplexService][updateRequisite]", error);
            throw error;
        }
    }

    async getServiceById(id) {
        try {
            return await sportsComplexRepository.getServiceById(id);
        } catch (error) {
            logger.error("[SportsComplexService][getServiceById]", error);
            throw error;
        }
    }

    async updateService(request) {
        try {
            const { id } = request.params;
            const { name, lesson_count, price, service_group_id } = request.body;
            
            const result = await sportsComplexRepository.updateService(id, {
                name,
                lesson_count,
                price,
                service_group_id
            });
            
            await logRepository.createLog({
                row_pk_id: id,
                uid: request?.user?.id,
                action: 'UPDATE',
                client_addr: request?.ip,
                application_name: 'Оновлення послуги басейну',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'sport',
                table_name: 'services',
                oid: '16505',
            });
            
            return { success: true, message: 'Послугу успішно оновлено' };
        } catch (error) {
            logger.error("[SportsComplexService][updateService]", error);
            throw error;
        }
    }

    async findClientsByFilter(request) {
        try {
            // Змінити request.body на request.query
            const { page = 1, limit = 16, ...whereConditions} = request.body;
            const { offset } = paginate(page, limit);
            
            const allowedFields = allowedClientsFilterFields.filter(el => whereConditions.hasOwnProperty(el)).reduce((acc, key) => ({ ...acc, [key]: whereConditions[key] }), {});

            const data = await sportsComplexRepository.findClientsByFilter(limit, offset, displayClientsFilterFields, allowedFields);
            
            if (Object.keys(whereConditions).length > 0) {
                await logRepository.createLog({
                    row_pk_id: null,
                    uid: request?.user?.id,
                    action: 'SEARCH',
                    client_addr: request?.ip,
                    application_name: 'Пошук клієнтів',
                    action_stamp_tx: new Date(),
                    action_stamp_stm: new Date(),
                    action_stamp_clk: new Date(),
                    schema_name: 'sport',
                    table_name: 'clients',
                    oid: '16507',
                });
            }
            
            return paginationData(data[0], page, limit, data[1]);
        } catch (error) {
            logger.error("[SportsComplexService][findClientsByFilter]", error);
            throw error;
        }
    }

    validateUkrainianPhone(phone) {
        const cleanPhone = phone.replace(/\s/g, '');
        const phoneRegex = /^\+380(50|63|66|67|68|91|92|93|94|95|96|97|98|99)\d{7}$/;
        return phoneRegex.test(cleanPhone);
    }

    normalizeUkrainianPhone(phone) {
        let cleanPhone = phone.replace(/\s/g, '');
        
        if (cleanPhone.startsWith('380') && !cleanPhone.startsWith('+380')) {
            cleanPhone = '+' + cleanPhone;
        }
        
        if (cleanPhone.startsWith('+380') && cleanPhone.length === 13) {
            return cleanPhone.replace(/(\+38)(\d{3})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
        }
        
        return phone;
    }

    async createClient(request) {
        try {
            const { name, phone_number, membership_number } = request.body;
            
            // Валідація ПІБ
            if (!name || name.trim().length < 2) {
                throw new Error('ПІБ клієнта обов\'язкове і має містити мінімум 2 символи');
            }
            
            // Валідація номера телефону
            if (!phone_number || !this.validateUkrainianPhone(phone_number)) {
                throw new Error('Номер телефону має бути у форматі +38 0XX XXX XX XX (український номер)');
            }
            
            // Нормалізуємо номер телефону
            const normalizedPhone = this.normalizeUkrainianPhone(phone_number);
            
            // ✅ ПОКРАЩЕНА ЛОГІКА ГЕНЕРАЦІЇ/ПЕРЕВІРКИ НОМЕРА АБОНЕМЕНТА
            let finalMembershipNumber = membership_number;
            
            if (!finalMembershipNumber || finalMembershipNumber.trim() === '') {
                // Генеруємо новий унікальний номер
                finalMembershipNumber = await sportsComplexRepository.generateUniqueClientNumber();
            } else {
                // Перевіряємо унікальність введеного номера
                const membershipToCheck = finalMembershipNumber.trim();
                const isUnique = await sportsComplexRepository.checkMembershipUnique(membershipToCheck);
                
                if (!isUnique) {
                    throw new Error(`Номер абонемента "${membershipToCheck}" вже існує. Залиште поле порожнім для автоматичної генерації або введіть інший номер.`);
                }
                
                finalMembershipNumber = membershipToCheck;
            }
            
            const result = await sportsComplexRepository.createClient({
                name: name.trim(),
                phone_number: normalizedPhone,
                membership_number: finalMembershipNumber
            });
            
            await logRepository.createLog({
                row_pk_id: result.id,
                uid: request?.user?.id,
                action: 'INSERT',
                client_addr: request?.ip,
                application_name: 'Створення клієнта',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'sport',
                table_name: 'clients',
                oid: '16507',
            });
            
            return { 
                success: true, 
                message: 'Клієнта успішно створено',
                id: result.id,
                membership_number: finalMembershipNumber
            };
        } catch (error) {
            logger.error("[SportsComplexService][createClient]", error);
            throw error;
        }
    }

    async updateClient(request) {
        try {
            const { id } = request.params;
            const { name, membership_number, phone_number, subscription_duration, service_name } = request.body;
            
            const result = await sportsComplexRepository.updateClient(id, {
                name,
                membership_number,
                phone_number,
                subscription_duration,
                service_name
            });
            
            await logRepository.createLog({
                row_pk_id: id,
                uid: request?.user?.id,
                action: 'UPDATE',
                client_addr: request?.ip,
                application_name: 'Оновлення клієнта',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'sport',
                table_name: 'clients',
                oid: '16507',
            });
            
            return { 
                success: true, 
                message: 'Клієнта успішно оновлено',
                id: result.id
            };
        } catch (error) {
            logger.error("[SportsComplexService][updateClient]", error);
            throw error;
        }
    }

    async renewSubscription(request) {
        try {
            const { id } = request.params;
            
            const client = await sportsComplexRepository.getClientById(id);
            if (!client) {
                const error = new Error('Клієнта не знайдено');
                error.statusCode = 404;
                throw error;
            }
            
            const success = await sportsComplexRepository.renewClientSubscription(id);
            
            if (success) {
                await logRepository.createLog({
                    row_pk_id: id,
                    uid: request?.user?.id,
                    action: 'UPDATE',
                    client_addr: request?.ip,
                    application_name: 'Оновлення абонемента',
                    action_stamp_tx: new Date(),
                    action_stamp_stm: new Date(),
                    action_stamp_clk: new Date(),
                    schema_name: 'sport',
                    table_name: 'clients',
                    oid: '16507',
                });
                
                return { 
                    success: true, 
                    message: 'Абонемент успішно оновлено на 30 днів' 
                };
            } else {
                throw new Error('Помилка при оновленні абонемента');
            }
        } catch (error) {
            logger.error("[SportsComplexService][renewSubscription]", error);
            throw error;
        }
    }

    async getClientById(id) {
        try {
            return await sportsComplexRepository.getClientById(id);
        } catch (error) {
            logger.error("[SportsComplexService][getClientById]", error);
            throw error;
        }
    }

    async deleteClient(request) {
        try {
            const { id } = request.params;
            
            const result = await sportsComplexRepository.deleteClient(id);
            
            if (!result) {
                throw new Error('Клієнта не знайдено');
            }
            
            await logRepository.createLog({
                row_pk_id: id,
                uid: request?.user?.id,
                action: 'DELETE',
                client_addr: request?.ip,
                application_name: 'Видалення клієнта',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'sport',
                table_name: 'clients',
                oid: '16507',
            });
            
            return { success: true, message: 'Клієнта успішно видалено' };
        } catch (error) {
            logger.error("[SportsComplexService][deleteClient]", error);
            throw error;
        }
    }

    async startLesson(request) {
        try {
            const { id } = request.params;
            
            const result = await sportsComplexRepository.startLesson(id);
            
            if (!result.success) {
                throw new Error(result.message);
            }
            
            await logRepository.createLog({
                row_pk_id: id,
                uid: request?.user?.id,
                action: 'UPDATE',
                client_addr: request?.ip,
                application_name: 'Початок заняття',
                action_stamp_tx: new Date(),
                action_stamp_stm: new Date(),
                action_stamp_clk: new Date(),
                schema_name: 'sport',
                table_name: 'clients',
                oid: '16507',
            });
            
            return result;
        } catch (error) {
            logger.error("[SportsComplexService][startLesson]", error);
            throw error;
        }
    }

    async searchClientByMembership(request) {
        try {
            const { membership_number } = request.body;
            const client = await sportsComplexRepository.searchClientByMembership(membership_number);
            return { data: client };
        } catch (error) {
            logger.error("[SportsComplexService][searchClientByMembership]", error);
            throw error;
        }
    }
}

module.exports = new SportsComplexService();