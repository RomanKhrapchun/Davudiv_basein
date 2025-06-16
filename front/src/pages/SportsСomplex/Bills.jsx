import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useFetch from "../../hooks/useFetch";
import Table from "../../components/common/Table/Table";
import { generateIcon, iconMap, STATUS } from "../../utils/constants.jsx";
import Button from "../../components/common/Button/Button";
import PageError from "../ErrorPage/PageError";
import classNames from "classnames";
import Pagination from "../../components/common/Pagination/Pagination";
import Input from "../../components/common/Input/Input";
import { fetchFunction, hasOnlyAllowedParams, validateFilters } from "../../utils/function";
import { useNotification } from "../../hooks/useNotification";
import { Context } from "../../main";
import Dropdown from "../../components/common/Dropdown/Dropdown";
import SkeletonPage from "../../components/common/Skeleton/SkeletonPage";
import Modal from "../../components/common/Modal/Modal.jsx";
import { Transition } from "react-transition-group";
import FormItem from "../../components/common/FormItem/FormItem";
import Select from "../../components/common/Select/Select";

// Іконки
const viewIcon = generateIcon(iconMap.view);
const downloadIcon = generateIcon(iconMap.download);
const editIcon = generateIcon(iconMap.edit);
const filterIcon = generateIcon(iconMap.filter);
const searchIcon = generateIcon(iconMap.search, 'input-icon');
const dropDownIcon = generateIcon(iconMap.arrowDown);
const addIcon = generateIcon(iconMap.add);
const cancelIcon = generateIcon(iconMap.close);
const dropDownStyle = { width: '100%' };
const childDropDownStyle = { justifyContent: 'center' };

// ✅ СПИСОК ПІЛЬГ
const DISCOUNT_OPTIONS = [
    {
        id: 'orphans_heroes',
        label: 'Дітям-сиротам, дітям із багатодітних сімей, дітям, батьки яких є героями'
    },
    {
        id: 'refugees_heroes_war',
        label: 'Дітям-біженцям, дітям з багатодітних сімей, дітям, батьки яких є героями війни або загинули'
    },
    {
        id: 'disability_1_2',
        label: 'Особам з інвалідністю I та II групи (мешканці Давидівської сільської територіальної громади)'
    },
    {
        id: 'war_veterans',
        label: 'Учасникам бойових дій та особам з інвалідністю внаслідок війни, які брали участь у бойових діях починаючи з 2014 року'
    },
    {
        id: 'military_service',
        label: 'Військовослужбовцям, які проходять службу у Збройних Силах України та інших військових формуваннях'
    },
    {
        id: 'families_fallen',
        label: 'Сім\'ям загиблих військовослужбовців, полонених та зниклих безвісти військових'
    }
];

const Bills = () => {
    const navigate = useNavigate();
    const notification = useNotification();
    const { store } = useContext(Context);
    const nodeRef = useRef(null);
    const addFormRef = useRef(null);
    const editFormRef = useRef(null);
    const clientSelectRef = useRef(null);
    const isFirstRun = useRef(true);
    
    const [state, setState] = useState({
        isOpen: false,
        selectData: {},
        confirmLoading: false,
        itemId: null,
        sendData: {
            limit: 16,
            page: 1,
        }
    });
    
    // ✅ ОНОВЛЕНИЙ СТАН для модального вікна створення рахунку
    const [createModalState, setCreateModalState] = useState({
        isOpen: false,
        loading: false,
        formData: {
            membership_number: '',
            client_name: '',
            phone_number: '',
            service_group_id: '',
            service_id: '',
            visit_count: '',
            price: 0,
            total_price: 0,
            discount_type: '',
            discount_applied: false,
        },
        serviceGroups: [],
        services: [],
        searchResults: [],
        isClientFound: false, // ✅ НОВИЙ СТАН для відстеження чи знайдено клієнта
    });

    // Стан для модального вікна редагування
    const [editModalState, setEditModalState] = useState({
        isOpen: false,
        loading: false,
        billId: null,
        formData: {
            membership_number: '',
            client_name: '',
            phone_number: '',
            service_group_id: '',
            service_id: '',
            visit_count: '',
            price: 0,
            total_price: 0,
            discount_type: '',
            discount_applied: false,
        },
        serviceGroups: [],
        services: [],
        searchResults: [],
        isClientFound: false, // ✅ НОВИЙ СТАН для редагування
    });
    
    // Стан для модального вікна вибору клієнта
    const [clientSelectModalState, setClientSelectModalState] = useState({
        isOpen: false,
        clients: [],
        onSelect: null,
        modalType: 'create'
    });

    // Завантаження даних рахунків
    const {error, status, data, retryFetch} = useFetch('api/sportscomplex/bills/filter', {
        method: 'post',
        data: state.sendData
    });

    // Завантаження груп послуг
    useEffect(() => {
        const loadServiceGroups = async () => {
            try {
                const response = await fetchFunction('/api/sportscomplex/service-groups', {
                    method: 'get'
                });
                
                if (response?.data) {
                    const groups = response.data.map(group => ({
                        value: group.id,
                        label: group.name
                    }));
                    
                    setCreateModalState(prev => ({ ...prev, serviceGroups: groups }));
                    setEditModalState(prev => ({ ...prev, serviceGroups: groups }));
                }
            } catch (error) {
                notification({
                    type: 'warning',
                    title: "Помилка",
                    message: "Не вдалося завантажити групи послуг",
                    placement: 'top',
                });
            }
        };

        loadServiceGroups();
    }, []);

    // Ефект для оновлення даних при зміні параметрів пошуку
    useEffect(() => {
        if (isFirstRun.current) {
            isFirstRun.current = false
            return;
        }
        retryFetch('api/sportscomplex/bills/filter', {
            method: 'post',
            data: state.sendData,
        })
    }, [state.sendData, retryFetch]);

    const startRecord = ((state.sendData.page || 1) - 1) * state.sendData.limit + 1;
    const endRecord = Math.min(startRecord + state.sendData.limit - 1, parseInt(data?.totalItems) || 1);

    // ✅ ВИПРАВЛЕНА функція пошуку клієнтів по номеру абонемента
    const searchClientByMembership = async (membershipNumber) => {
        console.log('🔍 Шукаємо клієнта з номером:', membershipNumber);
        
        if (!membershipNumber || membershipNumber.length < 5) {
            console.log('⚠️ Номер занадто короткий:', membershipNumber);
            return null;
        }
        
        try {
            const response = await fetchFunction(`/api/sportscomplex/clients/search-by-membership`, {
                method: 'post',
                data: { membership_number: membershipNumber }
            });
            
            console.log('📥 Відповідь від сервера:', response);
            // ✅ ВИПРАВЛЕННЯ: правильно отримуємо дані з відповіді
            return response?.data?.data || null;
        } catch (error) {
            console.error('❌ Помилка пошуку клієнта:', error);
            return null;
        }
    };

    // Завантаження послуг для вибраної групи
    const loadServicesForGroup = async (groupId, modalType = 'create') => {
        if (!groupId) {
            if (modalType === 'create') {
                setCreateModalState(prev => ({ ...prev, services: [] }));
            } else {
                setEditModalState(prev => ({ ...prev, services: [] }));
            }
            return;
        }
        
        try {
            const response = await fetchFunction(`/api/sportscomplex/services-by-group/${groupId}`, {
                method: 'get'
            });
            
            if (response?.data) {
                const services = Array.isArray(response.data) ? response.data.map(service => ({
                    value: service.id,
                    label: service.name,
                    visit_count: service.lesson_count,
                    price: service.price
                })) : [];

                if (modalType === 'create') {
                    setCreateModalState(prev => ({ ...prev, services }));
                } else {
                    setEditModalState(prev => ({ ...prev, services }));
                }
            }
        } catch (error) {
            notification({
                type: 'warning',
                title: "Помилка",
                message: "Не вдалося завантажити послуги",
                placement: 'top',
            });
        }
    };

    // ✅ ОНОВЛЕНІ КОЛОНКИ таблиці з додаванням колонки пільги
    const columnTable = useMemo(() => [
        {
            title: 'Номер абонемента',
            dataIndex: 'membership_number',
            width: '10%'
        },
        {
            title: 'ПІБ клієнта',
            dataIndex: 'client_name',
            width: '12%'
        },
        {
            title: 'Номер телефону',
            dataIndex: 'phone_number',
            width: '10%'
        },
        {
            title: 'Група послуг',
            dataIndex: 'service_group',
            width: '10%'
        },
        {
            title: 'Послуга',
            dataIndex: 'service_name',
            width: '12%'
        },
        {
            title: 'Кількість відвідувань',
            dataIndex: 'visit_count',
            width: '8%'
        },
        {
            title: 'Ціна',
            dataIndex: 'total_price',
            width: '8%',
            render: (price) => `${price} грн`
        },
        // ✅ НОВА КОЛОНКА - Пільга
        {
            title: 'Пільга',
            dataIndex: 'discount_type',
            width: '15%',
            render: (discountType) => {
                if (!discountType) return '—';
                const discount = DISCOUNT_OPTIONS.find(d => d.id === discountType);
                return discount ? discount.label : '—';
            }
        },
        {
            title: 'Дія',
            dataIndex: 'action',
            width: '15%',
            render: (_, record) => (
                <div className="btn-sticky" style={{ justifyContent: 'center' }}>
                    <Button
                        title="Редагувати"
                        icon={editIcon}
                        onClick={() => handleOpenEditModal(record)}
                    />
                    <Button
                        title="Скачати"
                        icon={downloadIcon}
                        onClick={() => handleDownloadBill(record.id)}
                    />
                </div>
            )
        }
    ], []);

    // ✅ ОНОВЛЕНА підготовка даних для таблиці
    const tableData = useMemo(() => {
        if (!Array.isArray(data?.items)) return [];
        return data.items.map(el => ({
            key: el.id,
            id: el.id,
            membership_number: el.membership_number,
            client_name: el.client_name,
            phone_number: el.phone_number,
            service_group: el.service_group,
            service_name: el.service_name,
            visit_count: el.visit_count,
            total_price: el.total_price,
            discount_type: el.discount_type,
            created_at: el.created_at // ✅ Для звітності
        }));
    }, [data]);

    // Пункти меню для вибору кількості записів на сторінці
    const itemMenu = [16, 32, 48].map(size => ({
        label: `${size}`,
        key: `${size}`,
        onClick: () => {
            if (state.sendData.limit !== size) {
                setState(prev => ({...prev, sendData: {...prev.sendData, limit: size, page: 1}}));
            }
        }
    }));

    // Функції для фільтрів
    const filterHandleClick = () => setState(prev => ({...prev, isOpen: !prev.isOpen}));

    const onHandleChange = (name, value) => setState(prev => ({
        ...prev, 
        selectData: {...prev.selectData, [name]: value}
    }));

    // ✅ ВИПРАВЛЕНА функція для зміни полів форми створення
    const onCreateFormChange = async (name, value) => {
        console.log('🔥 onCreateFormChange:', name, value);

        // Спочатку оновлюємо стан
        setCreateModalState(prev => ({
            ...prev,
            formData: {
                ...prev.formData,
                [name]: value
            }
        }));

        // ✅ АВТОЗАПОВНЕННЯ при введенні номера абонемента
        if (name === 'membership_number' && value.length >= 5) {
            console.log('🔍 Початок пошуку клієнта для номера:', value);
            
            try {
                const client = await searchClientByMembership(value);
                console.log('✅ Результат пошуку клієнта:', client);
                
                if (client) {
                    setCreateModalState(prev => ({
                        ...prev,
                        formData: {
                            ...prev.formData,
                            client_name: client.name || '',
                            phone_number: client.phone_number || ''
                        },
                        isClientFound: true // ✅ ПОЗНАЧАЄМО ЩО КЛІЄНТА ЗНАЙДЕНО
                    }));
                    console.log('✅ Дані клієнта заповнені:', client.name, client.phone_number);
                } else {
                    // Очищаємо поля, якщо клієнт не знайдений
                    setCreateModalState(prev => ({
                        ...prev,
                        formData: {
                            ...prev.formData,
                            client_name: '',
                            phone_number: ''
                        },
                        isClientFound: false // ✅ ПОЗНАЧАЄМО ЩО КЛІЄНТА НЕ ЗНАЙДЕНО
                    }));
                    console.log('❌ Клієнта не знайдено, поля очищено');
                }
            } catch (error) {
                console.error('❌ Помилка під час пошуку:', error);
                setCreateModalState(prev => ({
                    ...prev,
                    isClientFound: false
                }));
            }
        }

        // ✅ ОЧИЩАЄМО СТАТУС ПОШУКУ ЯКЩО НОМЕР АБОНЕМЕНТА ЗМІНИВСЯ
        if (name === 'membership_number' && value.length < 5) {
            setCreateModalState(prev => ({
                ...prev,
                isClientFound: false,
                formData: {
                    ...prev.formData,
                    client_name: '',
                    phone_number: ''
                }
            }));
        }
    };

    // Функції для модального вікна редагування
    const onEditFormChange = async (name, value) => {
        setEditModalState(prev => ({
            ...prev,
            formData: {
                ...prev.formData,
                [name]: value
            }
        }));

        if (name === 'membership_number' && value.length >= 5) {
            const client = await searchClientByMembership(value);
            if (client) {
                setEditModalState(prev => ({
                    ...prev,
                    formData: {
                        ...prev.formData,
                        client_name: client.name,
                        phone_number: client.phone_number
                    },
                    isClientFound: true
                }));
            } else {
                setEditModalState(prev => ({
                    ...prev,
                    isClientFound: false
                }));
            }
        }

        if (name === 'membership_number' && value.length < 5) {
            setEditModalState(prev => ({
                ...prev,
                isClientFound: false,
                formData: {
                    ...prev.formData,
                    client_name: '',
                    phone_number: ''
                }
            }));
        }
    };

    // ✅ ФУНКЦІЯ для обробки зміни пільги
    const handleDiscountChange = (discountId, modalType = 'create') => {
        const setState = modalType === 'create' ? setCreateModalState : setEditModalState;
        
        setState(prev => {
            const discountApplied = discountId ? true : false;
            const basePrice = prev.formData.price || 0;
            const finalPrice = discountApplied ? Math.round(basePrice * 0.5) : basePrice;
            
            return {
                ...prev,
                formData: {
                    ...prev.formData,
                    discount_type: discountId,
                    discount_applied: discountApplied,
                    total_price: finalPrice
                }
            };
        });
    };

    // Обробка вибору групи послуг
    const handleServiceGroupChange = (name, option, modalType = 'create') => {
        const groupId = option && typeof option === 'object' ? option.value : option;
        
        if (modalType === 'create') {
            setCreateModalState(prev => ({
                ...prev,
                formData: {
                    ...prev.formData,
                    service_group_id: option,
                    service_id: '',
                    visit_count: '',
                    price: 0,
                    total_price: 0
                }
            }));
        } else {
            setEditModalState(prev => ({
                ...prev,
                formData: {
                    ...prev.formData,
                    service_group_id: option,
                    service_id: '',
                    visit_count: '',
                    price: 0,
                    total_price: 0
                }
            }));
        }
        
        if (groupId) {
            loadServicesForGroup(groupId, modalType);
        }
    };

    // ✅ ОНОВЛЕНА обробка вибору послуги (з урахуванням пільги)
    const handleServiceChange = (name, option, modalType = 'create') => {
        if (!option) return;
        
        const services = modalType === 'create' ? createModalState.services : editModalState.services;
        const serviceOption = services.find(
            service => service.value === (typeof option === 'object' ? option.value : option)
        );
        
        if (serviceOption) {
            const { label, visit_count, price } = serviceOption;
            const currentDiscount = modalType === 'create' ? 
                createModalState.formData.discount_applied : 
                editModalState.formData.discount_applied;
            
            const finalPrice = currentDiscount ? Math.round(price * 0.5) : price;

            if (modalType === 'create') {
                setCreateModalState(prev => ({
                    ...prev,
                    formData: {
                        ...prev.formData,
                        service_id: option,
                        visit_count,
                        price,
                        total_price: finalPrice
                    }
                }));
            } else {
                setEditModalState(prev => ({
                    ...prev,
                    formData: {
                        ...prev.formData,
                        service_id: option,
                        visit_count,
                        price,
                        total_price: finalPrice
                    }
                }));
            }
        }
    };

    // Функції для фільтрів
    const resetFilters = () => {
        setState(prev => ({...prev, selectData: {}}));
        
        const dataReadyForSending = hasOnlyAllowedParams(state.sendData, ['limit', 'page']);
        if (!dataReadyForSending) {
            setState(prev => ({...prev, sendData: {limit: prev.sendData.limit, page: 1}}));
        }
    };

    const applyFilter = () => {
        if (Object.values(state.selectData).some(val => val)) {
            const dataValidation = validateFilters(state.selectData);
            if (!dataValidation.error) {
                setState(prev => ({...prev, sendData: {...dataValidation, limit: prev.sendData.limit, page: 1}}));
            } else {
                notification({ 
                    type: 'warning', 
                    title: 'Помилка', 
                    message: dataValidation.message,
                    placement: 'top' 
                });
            }
        }
    };

    // Функція для навігації по сторінках
    const onPageChange = useCallback(page => setState(prev => ({...prev, sendData: {...prev.sendData, page}})), []);

    const handleGenerateReport = async (period = 'today') => {
        try {
            setState(prev => ({...prev, confirmLoading: true}));
            
            if (!tableData || tableData.length === 0) {
                notification({
                    type: 'warning',
                    title: 'Немає даних',
                    message: 'У системі відсутні рахунки',
                    placement: 'top'
                });
                return;
            }
            
            // Перевіряємо чи є created_at
            const hasCreatedAt = tableData[0]?.created_at !== undefined;
            console.log('Поле created_at присутнє:', hasCreatedAt);
            
            if (!hasCreatedAt) {
                // Якщо created_at відсутнє, генеруємо звіт для всіх
                generatePDFReport(tableData, 'всі рахунки (поле дати відсутнє)');
                return;
            }
            
            // Якщо created_at є, фільтруємо за періодом
            const today = new Date();
            let filteredBills = [];
            let periodName = '';
            
            switch (period) {
                case 'today':
                    const todayStr = today.toISOString().split('T')[0];
                    filteredBills = tableData.filter(bill => {
                        if (!bill.created_at) return false;
                        const billDate = new Date(bill.created_at).toISOString().split('T')[0];
                        return billDate === todayStr;
                    });
                    periodName = 'сьогоднішній день';
                    break;
                    
                case 'all':
                    filteredBills = [...tableData];
                    periodName = 'всі рахунки';
                    break;
            }
            
            if (filteredBills.length === 0) {
                const confirmAll = window.confirm(
                    `За ${periodName} рахунків немає.\nЗгенерувати звіт по всіх рахунках (${tableData.length})?`
                );
                
                if (confirmAll) {
                    generatePDFReport(tableData, 'всі рахунки');
                }
                return;
            }
            
            generatePDFReport(filteredBills, periodName);
            
        } catch (error) {
            console.error('Помилка генерації звіту:', error);
            notification({
                type: 'error',
                title: 'Помилка',
                message: 'Не вдалося згенерувати звіт',
                placement: 'top'
            });
        } finally {
            setState(prev => ({...prev, confirmLoading: false}));
        }
    };

    const generatePDFReport = (bills, period) => {
        const reportData = {
            title: `Звіт по рахунках за ${period}`,
            date: new Date().toLocaleDateString('uk-UA'),
            period: period,
            totalBills: bills.length,
            totalAmount: bills.reduce((sum, bill) => sum + (bill.total_price || 0), 0),
            bills: bills.map((bill, index) => ({
                number: index + 1,
                membership_number: bill.membership_number || 'Не вказано',
                client_name: bill.client_name || 'Не вказано',
                phone_number: bill.phone_number || 'Не вказано',
                service_group: bill.service_group || 'Не вказано',
                service_name: bill.service_name || 'Не вказано',
                visit_count: bill.visit_count || 0,
                total_price: bill.total_price || 0,
                discount_type: bill.discount_type || 'Без знижки',
                created_at: bill.created_at ? 
                    new Date(bill.created_at).toLocaleDateString('uk-UA') : 
                    'Дата невідома'
            }))
        };
        
        console.log('Дані для PDF звіту:', reportData);
        
        notification({
            type: 'success',
            title: 'Успіх',
            message: `Звіт згенеровано для ${bills.length} рахунків на суму ${reportData.totalAmount} грн`,
            placement: 'top'
        });
    };

    // Функції для модального вікна створення
    const openCreateModal = () => {
        setCreateModalState(prev => ({
            ...prev,
            isOpen: true,
            formData: {
                membership_number: '',
                client_name: '',
                phone_number: '',
                service_group_id: '',
                service_id: '',
                visit_count: '',
                price: 0,
                total_price: 0,
                discount_type: '',
                discount_applied: false,
            },
            isClientFound: false // ✅ СКИДАЄМО СТАТУС ПОШУКУ
        }));
        document.body.style.overflow = 'hidden';
    };
    
    const closeCreateModal = () => {
        setCreateModalState(prev => ({ ...prev, isOpen: false }));
        document.body.style.overflow = 'auto';
    };

    // Функції для модального вікна редагування
    const handleOpenEditModal = async (bill) => {
        try {
            const response = await fetchFunction(`/api/sportscomplex/bills/${bill.id}`, {
                method: 'get'
            });
            
            const billData = response.data;
            
            setEditModalState(prev => ({
                ...prev,
                isOpen: true,
                billId: bill.id,
                formData: {
                    membership_number: billData.membership_number,
                    client_name: billData.client_name,
                    phone_number: billData.phone_number,
                    service_group_id: { value: billData.service_group_id, label: billData.service_group },
                    service_id: { value: billData.service_id, label: billData.service_name },
                    visit_count: billData.visit_count,
                    price: billData.price,
                    total_price: billData.total_price,
                    discount_type: billData.discount_type || '',
                    discount_applied: !!billData.discount_type,
                },
                isClientFound: true // ✅ ВСТАНОВЛЮЄМО ЩО КЛІЄНТА ЗНАЙДЕНО
            }));
            
            if (billData.service_group_id) {
                loadServicesForGroup(billData.service_group_id, 'edit');
            }
            
            document.body.style.overflow = 'hidden';
        } catch (error) {
            notification({
                type: 'warning',
                title: "Помилка",
                message: "Не вдалося завантажити дані рахунку",
                placement: 'top',
            });
        }
    };

    const closeEditModal = () => {
        setEditModalState(prev => ({ ...prev, isOpen: false, billId: null }));
        document.body.style.overflow = 'auto';
    };

    // ✅ ФУНКЦІЯ для створення рахунку
    const handleCreateFormSubmit = async () => {
        const { membership_number, client_name, phone_number, service_id, discount_type } = createModalState.formData;
        
        if (!membership_number || !client_name || !phone_number || !service_id) {
            notification({
                type: 'warning',
                placement: 'top',
                title: 'Помилка',
                message: 'Всі поля форми обов\'язкові для заповнення',
            });
            return;
        }

        // ✅ ПЕРЕВІРКА ЧИ ЗНАЙДЕНО КЛІЄНТА
        if (!createModalState.isClientFound) {
            notification({
                type: 'warning',
                placement: 'top',
                title: 'Помилка',
                message: 'Клієнта з таким номером абонемента не знайдено. Перевірте номер або створіть клієнта в розділі "Клієнти".',
            });
            return;
        }
        
        try {
            setCreateModalState(prev => ({...prev, loading: true}));
            
            const serviceIdValue = typeof service_id === 'object' ? service_id.value : service_id;
            
            await fetchFunction('/api/sportscomplex/bills', {
                method: 'post',
                data: {
                    membership_number,
                    client_name,
                    phone_number,
                    service_id: serviceIdValue,
                    discount_type: discount_type || null
                }
            });
            
            notification({
                type: 'success',
                placement: 'top',
                title: 'Успіх',
                message: 'Рахунок успішно створено',
            });
            
            retryFetch('/api/sportscomplex/bills/filter', {
                method: 'post',
                data: state.sendData,
            });
            
            closeCreateModal();
        } catch (error) {
            if (error?.response?.status === 401) {
                notification({
                    type: 'warning',
                    title: "Помилка",
                    message: "Не авторизований",
                    placement: 'top',
                });
                store.logOff();
                return navigate('/');
            }
            
            notification({
                type: 'warning',
                title: "Помилка",
                message: error?.response?.data?.message || error?.response?.data?.error || error.message,
                placement: 'top',
            });
        } finally {
            setCreateModalState(prev => ({...prev, loading: false}));
        }
    };

    // ✅ ФУНКЦІЯ для редагування рахунку
    const handleEditFormSubmit = async () => {
        const { membership_number, client_name, phone_number, service_id, discount_type } = editModalState.formData;
        
        if (!membership_number || !client_name || !phone_number || !service_id) {
            notification({
                type: 'warning',
                placement: 'top',
                title: 'Помилка',
                message: 'Всі поля форми обов\'язкові для заповнення',
            });
            return;
        }
        
        try {
            setEditModalState(prev => ({...prev, loading: true}));
            
            const serviceIdValue = typeof service_id === 'object' ? service_id.value : service_id;
            
            await fetchFunction(`/api/sportscomplex/bills/${editModalState.billId}`, {
                method: 'put',
                data: {
                    membership_number,
                    client_name,
                    phone_number,
                    service_id: serviceIdValue,
                    discount_type: discount_type || null
                }
            });
            
            notification({
                type: 'success',
                placement: 'top',
                title: 'Успіх',
                message: 'Рахунок успішно оновлено',
            });
            
            retryFetch('/api/sportscomplex/bills/filter', {
                method: 'post',
                data: state.sendData,
            });
            
            closeEditModal();
        } catch (error) {
            if (error?.response?.status === 401) {
                notification({
                    type: 'warning',
                    title: "Помилка",
                    message: "Не авторизований",
                    placement: 'top',
                });
                store.logOff();
                return navigate('/');
            }
            
            notification({
                type: 'warning',
                title: "Помилка",
                message: error?.response?.data?.message || error?.response?.data?.error || error.message,
                placement: 'top',
            });
        } finally {
            setEditModalState(prev => ({...prev, loading: false}));
        }
    };

    // Функція для скачування рахунку
    const handleDownloadBill = async (billId) => {
        try {
            setState(prev => ({...prev, confirmLoading: true}));
            
            const response = await fetchFunction(`/api/sportscomplex/bills/${billId}/download`, {
                method: 'get',
                responseType: 'blob'
            });
            
            notification({
                placement: "top",
                duration: 2,
                title: 'Успіх',
                message: "Файл успішно сформовано.",
                type: 'success'
            });
            
            const blob = response.data;
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `bill-${billId}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (error) {
            if (error?.response?.status === 401) {
                notification({
                    type: 'warning',
                    title: "Помилка",
                    message: "Не авторизований",
                    placement: 'top',
                });
                store.logOff();
                return navigate('/');
            }
            
            notification({
                type: 'warning',
                title: "Помилка",
                message: error?.response?.data?.message ? error.response.data.message : error.message,
                placement: 'top',
            });
        } finally {
            setState(prev => ({...prev, confirmLoading: false}));
        }
    };

    // Функції для модального вікна вибору клієнта
    const closeClientSelectModal = () => {
        setClientSelectModalState({
            isOpen: false,
            clients: [],
            onSelect: null,
            modalType: 'create'
        });
        document.body.style.overflow = 'auto';
    };

    const handleClientSelect = (client) => {
        if (clientSelectModalState.onSelect) {
            clientSelectModalState.onSelect(client);
        }
        closeClientSelectModal();
    };

    // Обробка помилок
    if (status === STATUS.ERROR) {
        return <PageError title={error.message} statusError={error.status} />;
    }

    return (
        <>
            {status === STATUS.PENDING && <SkeletonPage />}
            
            {status === STATUS.SUCCESS && (
                <div className="table-elements">
                    <div className="table-header">
                        <h2 className="title title--sm">
                            {data?.items?.length ? 
                                `Показує ${startRecord !== endRecord ? `${startRecord}-${endRecord}` : startRecord} з ${data?.totalItems || 1}` : 
                                'Записів не знайдено'
                            }
                        </h2>
                        <div className="table-header__buttons">
                            <Button 
                                className="btn--primary"
                                onClick={openCreateModal}
                                icon={addIcon}
                            >
                                Створити
                            </Button>
                            {/* ✅ НОВА КНОПКА ЗВІТНІСТЬ */}
                            <Button 
                                className="btn--secondary"
                                onClick={handleGenerateReport}
                                icon={downloadIcon}
                                loading={state.confirmLoading}
                            >
                                Звітність
                            </Button>
                            <Dropdown 
                                icon={dropDownIcon} 
                                iconPosition="right" 
                                style={dropDownStyle} 
                                childStyle={childDropDownStyle} 
                                caption={`Записів: ${state.sendData.limit}`} 
                                menu={itemMenu} 
                            />
                            <Button 
                                className="table-filter-trigger" 
                                onClick={filterHandleClick} 
                                icon={filterIcon}
                            >
                                Фільтри
                            </Button>
                        </div>
                    </div>
                    <div className="table-main">
                        <div 
                            style={{width: data?.items?.length > 0 ? 'auto' : '100%'}} 
                            className={classNames("table-and-pagination-wrapper", {"table-and-pagination-wrapper--active": state.isOpen})}
                        >
                            <Table 
                                columns={Array.isArray(columnTable) ? columnTable.filter(Boolean) : []} 
                                dataSource={Array.isArray(tableData) ? tableData : []}
                            />
                            <Pagination 
                                className="m-b" 
                                currentPage={parseInt(data?.currentPage) || 1} 
                                totalCount={parseInt(data?.totalItems) || 1} 
                                pageSize={state.sendData.limit} 
                                onPageChange={onPageChange} 
                            />
                        </div>
                        <div className={`table-filter ${state.isOpen ? "table-filter--active" : ""}`}>
                            <h3 className="title title--sm">Фільтри</h3>
                            <div className="btn-group">
                                <Button onClick={applyFilter}>Застосувати</Button>
                                <Button className="btn--secondary" onClick={resetFilters}>Скинути</Button>
                            </div>
                            <div className="table-filter__item">
                                <Input 
                                    icon={searchIcon} 
                                    name="membership_number" 
                                    placeholder="Номер абонемента" 
                                    value={state.selectData?.membership_number || ''} 
                                    onChange={onHandleChange} 
                                />
                            </div>
                            <div className="table-filter__item">
                                <Input 
                                    icon={searchIcon} 
                                    name="client_name" 
                                    placeholder="ПІБ клієнта" 
                                    value={state.selectData?.client_name || ''} 
                                    onChange={onHandleChange} 
                                />
                            </div>
                            <div className="table-filter__item">
                                <Input 
                                    icon={searchIcon} 
                                    name="phone_number" 
                                    placeholder="Номер телефону" 
                                    value={state.selectData?.phone_number || ''} 
                                    onChange={onHandleChange} 
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* ✅ ВИПРАВЛЕНЕ модальне вікно для створення нового рахунку */}
            <Transition in={createModalState.isOpen} timeout={200} unmountOnExit nodeRef={addFormRef}>
                {transitionState => (
                    <Modal
                        className={transitionState === 'entered' ? "modal-window-wrapper--active" : ""}
                        onClose={closeCreateModal}
                        onOk={handleCreateFormSubmit}
                        confirmLoading={createModalState.loading}
                        cancelText="Скасувати"
                        okText="Зберегти"
                        title="Створення нового рахунку"
                        width="700px"
                    >
                        <div className="form-container">
                            {/* ✅ ПЕРШЕ ПОЛЕ - Номер абонемента */}
                            <FormItem 
                                label="Номер абонемента" 
                                required 
                                fullWidth
                            >
                                <Input
                                    name="membership_number"
                                    value={createModalState.formData.membership_number}
                                    onChange={onCreateFormChange}
                                    placeholder="Введіть номер абонемента"
                                />
                            </FormItem>
                            
                            {/* ✅ ІНДИКАТОР ПОШУКУ КЛІЄНТА */}
                            {createModalState.formData.membership_number.length >= 5 && (
                                <div style={{ 
                                    padding: '8px 12px', 
                                    borderRadius: '4px',
                                    fontSize: '14px',
                                    marginBottom: '16px',
                                    backgroundColor: createModalState.isClientFound ? '#e6f7ff' : '#fff2e8',
                                    border: `1px solid ${createModalState.isClientFound ? '#91d5ff' : '#ffcc99'}`,
                                    color: createModalState.isClientFound ? '#096dd9' : '#d46b08'
                                }}>
                                    {createModalState.isClientFound ? 
                                        '✅ Клієнта знайдено! Дані автоматично заповнені.' : 
                                        '⚠️ Клієнта з таким номером абонемента не знайдено.'}
                                </div>
                            )}
                            
                            {/* ✅ ПОЛЯ ПІБ ТА ТЕЛЕФОН - тепер disabled коли клієнта знайдено */}
                            <FormItem 
                                label="ПІБ клієнта" 
                                required 
                                fullWidth
                            >
                                <Input
                                    name="client_name"
                                    value={createModalState.formData.client_name}
                                    onChange={onCreateFormChange}
                                    placeholder={createModalState.isClientFound ? 
                                        "Автоматично заповнено" : 
                                        "Спочатку введіть номер абонемента"}
                                    disabled={createModalState.isClientFound}
                                    style={{ 
                                        backgroundColor: createModalState.isClientFound ? '#f5f5f5' : 'white',
                                        color: createModalState.isClientFound ? '#666' : 'inherit'
                                    }}
                                />
                            </FormItem>
                            
                            <FormItem 
                                label="Номер телефону" 
                                required 
                                fullWidth
                            >
                                <Input
                                    name="phone_number"
                                    value={createModalState.formData.phone_number}
                                    onChange={onCreateFormChange}
                                    placeholder={createModalState.isClientFound ? 
                                        "Автоматично заповнено" : 
                                        "Спочатку введіть номер абонемента"}
                                    disabled={createModalState.isClientFound}
                                    style={{ 
                                        backgroundColor: createModalState.isClientFound ? '#f5f5f5' : 'white',
                                        color: createModalState.isClientFound ? '#666' : 'inherit'
                                    }}
                                />
                            </FormItem>
                            
                            <FormItem 
                                label="Група послуг" 
                                required 
                                fullWidth
                            >
                                <Select
                                    placeholder="Виберіть групу послуг"
                                    value={createModalState.formData.service_group_id}
                                    onChange={(name, option) => handleServiceGroupChange(name, option, 'create')}
                                    options={createModalState.serviceGroups}
                                />
                            </FormItem>
                            
                            <FormItem 
                                label="Послуга" 
                                required 
                                fullWidth
                            >
                                <Select
                                    placeholder="Виберіть послугу"
                                    value={createModalState.formData.service_id}
                                    onChange={(name, option) => handleServiceChange(name, option, 'create')}
                                    options={createModalState.services}
                                    disabled={!createModalState.formData.service_group_id}
                                />
                            </FormItem>
                            
                            {/* ✅ БЛОК ПІЛЬГ */}
                            <FormItem 
                                label="Пільги (знижка 50%)" 
                                fullWidth
                            >
                                <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #ddd', padding: '10px', borderRadius: '4px' }}>
                                    {DISCOUNT_OPTIONS.map(discount => (
                                        <div key={discount.id} style={{ marginBottom: '8px' }}>
                                            <label style={{ display: 'flex', alignItems: 'flex-start', cursor: 'pointer', fontSize: '14px' }}>
                                                <input
                                                    type="radio"
                                                    name="discount_type"
                                                    value={discount.id}
                                                    checked={createModalState.formData.discount_type === discount.id}
                                                    onChange={(e) => handleDiscountChange(e.target.value, 'create')}
                                                    style={{ marginRight: '8px', marginTop: '2px' }}
                                                />
                                                <span style={{ lineHeight: '1.4' }}>{discount.label}</span>
                                            </label>
                                        </div>
                                    ))}
                                    <div style={{ marginBottom: '8px' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '14px' }}>
                                            <input
                                                type="radio"
                                                name="discount_type"
                                                value=""
                                                checked={!createModalState.formData.discount_type}
                                                onChange={(e) => handleDiscountChange('', 'create')}
                                                style={{ marginRight: '8px' }}
                                            />
                                            <span>Без пільги</span>
                                        </label>
                                    </div>
                                </div>
                            </FormItem>
                            
                            <div className="form-row" style={{display: 'flex', gap: '16px'}}>
                                <FormItem 
                                    label="Кількість відвідувань" 
                                    fullWidth
                                >
                                    <Input
                                        name="visit_count"
                                        value={createModalState.formData.visit_count}
                                        disabled={true}
                                    />
                                </FormItem>
                                
                                <FormItem 
                                    label="Ціна" 
                                    fullWidth
                                >
                                    <Input
                                        name="total_price"
                                        value={createModalState.formData.total_price ? `${createModalState.formData.total_price} грн` : ''}
                                        disabled={true}
                                    />
                                </FormItem>
                            </div>
                            
                            {/* ✅ ІНДИКАТОР ПІЛЬГИ */}
                            {createModalState.formData.discount_applied && (
                                <div style={{ 
                                    padding: '10px', 
                                    backgroundColor: '#e6f7ff', 
                                    border: '1px solid #91d5ff', 
                                    borderRadius: '4px',
                                    fontSize: '14px',
                                    color: '#096dd9'
                                }}>
                                    ✅ Застосована знижка 50% за пільгою
                                </div>
                            )}
                        </div>
                    </Modal>
                )}
            </Transition>
            
            {/* ✅ МОДАЛЬНЕ ВІКНО для редагування рахунку */}
            <Transition in={editModalState.isOpen} timeout={200} unmountOnExit nodeRef={editFormRef}>
                {transitionState => (
                    <Modal
                        className={transitionState === 'entered' ? "modal-window-wrapper--active" : ""}
                        onClose={closeEditModal}
                        onOk={handleEditFormSubmit}
                        confirmLoading={editModalState.loading}
                        cancelText="Скасувати"
                        okText="Зберегти"
                        title="Редагування рахунку"
                        width="700px"
                    >
                        <div className="form-container">
                            <FormItem 
                                label="Номер абонемента" 
                                required 
                                fullWidth
                            >
                                <Input
                                    name="membership_number"
                                    value={editModalState.formData.membership_number}
                                    onChange={onEditFormChange}
                                    placeholder="Введіть номер абонемента"
                                />
                            </FormItem>
                            
                            {/* ✅ ІНДИКАТОР ПОШУКУ КЛІЄНТА для редагування */}
                            {editModalState.formData.membership_number.length >= 5 && (
                                <div style={{ 
                                    padding: '8px 12px', 
                                    borderRadius: '4px',
                                    fontSize: '14px',
                                    marginBottom: '16px',
                                    backgroundColor: editModalState.isClientFound ? '#e6f7ff' : '#fff2e8',
                                    border: `1px solid ${editModalState.isClientFound ? '#91d5ff' : '#ffcc99'}`,
                                    color: editModalState.isClientFound ? '#096dd9' : '#d46b08'
                                }}>
                                    {editModalState.isClientFound ? 
                                        '✅ Клієнта знайдено! Дані автоматично заповнені.' : 
                                        '⚠️ Клієнта з таким номером абонемента не знайдено.'}
                                </div>
                            )}
                            
                            <FormItem 
                                label="ПІБ клієнта" 
                                required 
                                fullWidth
                            >
                                <Input
                                    name="client_name"
                                    value={editModalState.formData.client_name}
                                    onChange={onEditFormChange}
                                    placeholder="Автоматично заповнюється"
                                    disabled={editModalState.isClientFound}
                                    style={{ 
                                        backgroundColor: editModalState.isClientFound ? '#f5f5f5' : 'white',
                                        color: editModalState.isClientFound ? '#666' : 'inherit'
                                    }}
                                />
                            </FormItem>
                            
                            <FormItem 
                                label="Номер телефону" 
                                required 
                                fullWidth
                            >
                                <Input
                                    name="phone_number"
                                    value={editModalState.formData.phone_number}
                                    onChange={onEditFormChange}
                                    placeholder="Автоматично заповнюється"
                                    disabled={editModalState.isClientFound}
                                    style={{ 
                                        backgroundColor: editModalState.isClientFound ? '#f5f5f5' : 'white',
                                        color: editModalState.isClientFound ? '#666' : 'inherit'
                                    }}
                                />
                            </FormItem>
                            
                            <FormItem 
                                label="Група послуг" 
                                required 
                                fullWidth
                            >
                                <Select
                                    placeholder="Виберіть групу послуг"
                                    value={editModalState.formData.service_group_id}
                                    onChange={(name, option) => handleServiceGroupChange(name, option, 'edit')}
                                    options={editModalState.serviceGroups}
                                />
                            </FormItem>
                            
                            <FormItem 
                                label="Послуга" 
                                required 
                                fullWidth
                            >
                                <Select
                                    placeholder="Виберіть послугу"
                                    value={editModalState.formData.service_id}
                                    onChange={(name, option) => handleServiceChange(name, option, 'edit')}
                                    options={editModalState.services}
                                    disabled={!editModalState.formData.service_group_id}
                                />
                            </FormItem>
                            
                            <FormItem 
                                label="Пільги (знижка 50%)" 
                                fullWidth
                            >
                                <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #ddd', padding: '10px', borderRadius: '4px' }}>
                                    {DISCOUNT_OPTIONS.map(discount => (
                                        <div key={discount.id} style={{ marginBottom: '8px' }}>
                                            <label style={{ display: 'flex', alignItems: 'flex-start', cursor: 'pointer', fontSize: '14px' }}>
                                                <input
                                                    type="radio"
                                                    name="discount_type"
                                                    value={discount.id}
                                                    checked={editModalState.formData.discount_type === discount.id}
                                                    onChange={(e) => handleDiscountChange(e.target.value, 'edit')}
                                                    style={{ marginRight: '8px', marginTop: '2px' }}
                                                />
                                                <span style={{ lineHeight: '1.4' }}>{discount.label}</span>
                                            </label>
                                        </div>
                                    ))}
                                    <div style={{ marginBottom: '8px' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '14px' }}>
                                            <input
                                                type="radio"
                                                name="discount_type"
                                                value=""
                                                checked={!editModalState.formData.discount_type}
                                                onChange={(e) => handleDiscountChange('', 'edit')}
                                                style={{ marginRight: '8px' }}
                                            />
                                            <span>Без пільги</span>
                                        </label>
                                    </div>
                                </div>
                            </FormItem>
                            
                            <div className="form-row" style={{display: 'flex', gap: '16px'}}>
                                <FormItem 
                                    label="Кількість відвідувань" 
                                    fullWidth
                                >
                                    <Input
                                        name="visit_count"
                                        value={editModalState.formData.visit_count}
                                        disabled={true}
                                    />
                                </FormItem>
                                
                                <FormItem 
                                    label="Ціна" 
                                    fullWidth
                                >
                                    <Input
                                        name="total_price"
                                        value={editModalState.formData.total_price ? `${editModalState.formData.total_price} грн` : ''}
                                        disabled={true}
                                    />
                                </FormItem>
                            </div>
                            
                            {editModalState.formData.discount_applied && (
                                <div style={{ 
                                    padding: '10px', 
                                    backgroundColor: '#e6f7ff', 
                                    border: '1px solid #91d5ff', 
                                    borderRadius: '4px',
                                    fontSize: '14px',
                                    color: '#096dd9'
                                }}>
                                    ✅ Застосована знижка 50% за пільгою
                                </div>
                            )}
                        </div>
                    </Modal>
                )}
            </Transition>
        </>
    );
};

export default Bills;