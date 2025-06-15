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

// Іконки
const editIcon = generateIcon(iconMap.edit);
const filterIcon = generateIcon(iconMap.filter);
const searchIcon = generateIcon(iconMap.search, 'input-icon');
const dropDownIcon = generateIcon(iconMap.arrowDown);
const addIcon = generateIcon(iconMap.add);
const eyeIcon = generateIcon(iconMap.eye);
const playIcon = generateIcon(iconMap.play);
const dropDownStyle = { width: '100%' };
const childDropDownStyle = { justifyContent: 'center' };

const Clients = () => {
    const navigate = useNavigate();
    const notification = useNotification();
    const { store } = useContext(Context);
    const addFormRef = useRef(null);
    const editFormRef = useRef(null);
    const confirmFormRef = useRef(null);
    const startLessonFormRef = useRef(null);
    const isFirstRun = useRef(true);
    
    const [state, setState] = useState({
        isOpen: false,
        selectData: {},
        sendData: {
            limit: 16,
            page: 1,
        }
    });
    
    // Спрощений стан для створення клієнта
    const [createModalState, setCreateModalState] = useState({
        isOpen: false,
        loading: false,
        formData: {
            name: '',
            phone_number: '+38 ',
            membership_number: ''
        }
    });
    
    // Спрощений стан для редагування клієнта
    const [editModalState, setEditModalState] = useState({
        isOpen: false,
        loading: false,
        clientId: null,
        formData: {
            name: '',
            phone_number: '',
            membership_number: ''
        }
    });

    // Стан для оновлення абонемента
    const [confirmModalState, setConfirmModalState] = useState({
        isOpen: false,
        loading: false,
        clientId: null,
        clientName: ''
    });

    // Стан для початку заняття
    const [startLessonModalState, setStartLessonModalState] = useState({
        isOpen: false,
        loading: false,
        clientId: null,
        clientName: '',
        remainingVisits: 0
    });

    const { error, status, data, retryFetch } = useFetch('api/sportscomplex/clients/filter', {
        method: 'post',
        data: state.sendData
    });

    const startRecord = ((state.sendData.page || 1) - 1) * state.sendData.limit + 1;
    const endRecord = Math.min(startRecord + state.sendData.limit - 1, data?.totalItems || 1);

    const formatPhoneNumber = (value) => {
        try {
            // Видаляємо все окрім цифр і +
            let cleanValue = value.replace(/[^\d+]/g, '');
            
            // Якщо починається не з +38, додаємо +38 на початок
            if (!cleanValue.startsWith('+38')) {
                // Якщо починається з 38, додаємо +
                if (cleanValue.startsWith('38')) {
                    cleanValue = '+' + cleanValue;
                }
                // Якщо починається з 380, замінюємо на +38
                else if (cleanValue.startsWith('380')) {
                    cleanValue = '+38' + cleanValue.slice(3);
                }
                // Якщо тільки цифри, додаємо +38 на початок
                else if (/^\d/.test(cleanValue)) {
                    cleanValue = '+38' + cleanValue;
                }
                // Якщо тільки +, додаємо 38
                else if (cleanValue === '+') {
                    cleanValue = '+38';
                }
            }
            
            // Обмежуємо довжину (+38 + 10 цифр = 13 символів)
            if (cleanValue.length > 13) {
                cleanValue = cleanValue.slice(0, 13);
            }
            
            // Додаємо пробіли для читабельності: +38 XXX XXX XX XX
            if (cleanValue.length > 3) {
                const prefix = cleanValue.slice(0, 3); // +38
                const rest = cleanValue.slice(3);
                
                if (rest.length <= 3) {
                    return `${prefix} ${rest}`;
                } else if (rest.length <= 6) {
                    return `${prefix} ${rest.slice(0, 3)} ${rest.slice(3)}`;
                } else if (rest.length <= 8) {
                    return `${prefix} ${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6)}`;
                } else {
                    return `${prefix} ${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6, 8)} ${rest.slice(8)}`;
                }
            }
            
            return cleanValue;
            
        } catch (error) {
            console.error('Помилка форматування номера телефону:', error);
            return value || '+38 ';
        }
    };

    // Валідація українського номера
    const validateUkrainianPhone = (phone) => {
        const cleanPhone = phone.replace(/\s/g, '');
        const phoneRegex = /^\+380(50|63|66|67|68|91|92|93|94|95|96|97|98|99)\d{7}$/;
        return phoneRegex.test(cleanPhone);
    };

    // ✅ ФУНКЦІЯ для динамічного додавання нового клієнта
    const addClientToList = (newClient) => {
        setLocalData(prevData => {
            if (!prevData) return prevData;
            
            const newClientFormatted = {
                id: newClient.id,
                name: newClient.name,
                membership_number: newClient.membership_number,
                phone_number: newClient.phone_number,
                current_service_name: 'Немає активної послуги',
                remaining_visits: 0,
                subscription_duration: '30 днів',
                subscription_days_left: 30,
                subscription_active: true,
                subscription_start_date: new Date().toISOString(),
                subscription_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                created_at: new Date().toISOString()
            };

            // Якщо ми на першій сторінці, додаємо на початок списку
            if (state.sendData.page === 1) {
                return {
                    ...prevData,
                    items: [newClientFormatted, ...prevData.items].slice(0, state.sendData.limit),
                    totalItems: prevData.totalItems + 1
                };
            } else {
                // Якщо не на першій сторінці, просто збільшуємо загальну кількість
                return {
                    ...prevData,
                    totalItems: prevData.totalItems + 1
                };
            }
        });
    };

    // ✅ ФУНКЦІЯ для динамічного оновлення клієнта
    const updateClientInList = (updatedClient) => {
        setLocalData(prevData => {
            if (!prevData || !prevData.items) return prevData;
            
            return {
                ...prevData,
                items: prevData.items.map(client => 
                    client.id === updatedClient.id 
                        ? { ...client, ...updatedClient }
                        : client
                )
            };
        });
    };

    // Колонки таблиці
    const columns = useMemo(() => [
        { title: 'ПІБ клієнта', dataIndex: 'name', key: 'name' },
        { title: 'Номер абонемента', dataIndex: 'membership_number', key: 'membership_number' },
        { title: 'Номер телефону', dataIndex: 'phone_number', key: 'phone_number' },
        { 
            title: 'Поточна послуга', 
            dataIndex: 'current_service_name', 
            key: 'current_service_name',
            render: (value) => value || 'Немає активної послуги'
        },
        { 
            title: 'Залишилось відвідувань', 
            dataIndex: 'remaining_visits', 
            key: 'remaining_visits',
            render: (value, record) => {
                const visits = value || 0;
                const color = visits === 0 ? 'red' : visits <= 3 ? 'orange' : 'green';
                return <span style={{ color, fontWeight: 'bold' }}>{visits}</span>;
            }
        },
        {
            title: 'Статус абонемента',
            key: 'subscription_status',
            render: (_, record) => {
                if (!record.subscription_active || record.subscription_days_left <= 0) {
                    return <span style={{ color: 'red' }}>Абонемент не активний, прошу оновіть його</span>;
                }
                return <span style={{ color: 'green' }}>{record.subscription_days_left} днів залишилось</span>;
            }
        },
        {
            title: 'Дії',
            key: 'actions',
            render: (_, record) => (
                <div className="btn-sticky" style={{ justifyContent: 'center' }}>
                    <Button 
                        title="Редагувати"
                        icon={editIcon} 
                        onClick={() => handleOpenEditModal(record)}
                    />
                    <Button 
                        title="Оновити абонемент"
                        icon={eyeIcon} 
                        onClick={() => handleOpenRenewModal(record)}
                    />
                    <Button 
                        title="Почати заняття"
                        icon={playIcon} 
                        onClick={() => handleOpenStartLessonModal(record)}
                        className={record.remaining_visits === 0 ? "btn--disabled" : ""}
                    />
                </div>
            )
        }
    ], [editIcon, eyeIcon, playIcon]);

    // Дані таблиці з використанням локальних даних
    const tableData = useMemo(() => {
        if (!Array.isArray(data?.items)) return [];
        return data.items.map(el => ({
            key: el.id,
            id: el.id,
            name: el.name,
            membership_number: el.membership_number,
            phone_number: el.phone_number,
            current_service_name: el.current_service_name,
            remaining_visits: el.remaining_visits,
            subscription_duration: el.subscription_duration,
            subscription_days_left: el.subscription_days_left,
            subscription_active: el.subscription_active
        }));
    }, [data]);

    // Пункти меню для кількості записів
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

    // Функції для форм
    const onCreateFormChange = (name, value) => {
        if (name === 'phone_number') {
            value = formatPhoneNumber(value);
        }
        
        setCreateModalState(prev => ({
            ...prev,
            formData: {
                ...prev.formData,
                [name]: value
            }
        }));
    };

    const onEditFormChange = (name, value) => {
        if (name === 'phone_number') {
            value = formatPhoneNumber(value);
        }
        
        setEditModalState(prev => ({
            ...prev,
            formData: {
                ...prev.formData,
                [name]: value
            }
        }));
    };

    // Функції фільтрів
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

    // Навігація по сторінках
    const onPageChange = useCallback(page => setState(prev => ({...prev, sendData: {...prev.sendData, page}})), []);

    // Модальні вікна - створення
    const openCreateModal = () => {
        setCreateModalState(prev => ({
            ...prev,
            isOpen: true,
            formData: {
                name: '',
                phone_number: '+38 ',
                membership_number: ''
            }
        }));
        document.body.style.overflow = 'hidden';
    };
    
    const closeCreateModal = () => {
        setCreateModalState(prev => ({ 
            ...prev, 
            isOpen: false,
            loading: false,
            formData: {
                name: '',
                phone_number: '+38 ',
                membership_number: ''
            }
        }));
        document.body.style.overflow = 'auto';
    };

    // Модальні вікна - редагування
    const handleOpenEditModal = async (client) => {
        setEditModalState(prev => ({
            ...prev,
            isOpen: true,
            clientId: client.id,
            formData: {
                name: client.name,
                membership_number: client.membership_number,
                phone_number: client.phone_number
            }
        }));
        document.body.style.overflow = 'hidden';
    };

    const closeEditModal = () => {
        setEditModalState(prev => ({ ...prev, isOpen: false, clientId: null }));
        document.body.style.overflow = 'auto';
    };

    // Модальні вікна - оновлення абонемента
    const handleOpenRenewModal = (client) => {
        setConfirmModalState(prev => ({
            ...prev,
            isOpen: true,
            clientId: client.id,
            clientName: client.name
        }));
        document.body.style.overflow = 'hidden';
    };

    const closeRenewModal = () => {
        setConfirmModalState(prev => ({ ...prev, isOpen: false, clientId: null, clientName: '' }));
        document.body.style.overflow = 'auto';
    };

    // Модальні вікна - початок заняття
    const handleOpenStartLessonModal = (client) => {
        if (client.remaining_visits === 0) {
            notification({
                type: 'warning',
                title: 'Немає доступних відвідувань',
                message: 'Кількість занять використана, будь ласка оновіть абонемент або придбайте новий.',
                placement: 'top'
            });
            return;
        }

        setStartLessonModalState(prev => ({
            ...prev,
            isOpen: true,
            clientId: client.id,
            clientName: client.name,
            remainingVisits: client.remaining_visits
        }));
        document.body.style.overflow = 'hidden';
    };

    const closeStartLessonModal = () => {
        setStartLessonModalState(prev => ({ 
            ...prev, 
            isOpen: false, 
            clientId: null, 
            clientName: '',
            remainingVisits: 0
        }));
        document.body.style.overflow = 'auto';
    };

    const handleCreateFormSubmit = async () => {
        const { name, phone_number, membership_number } = createModalState.formData;
        
        // Валідація форми
        if (!name || !phone_number) {
            notification({
                type: 'warning',
                placement: 'top',
                title: 'Помилка',
                message: 'Всі поля форми обов\'язкові для заповнення',
            });
            return;
        }
        
        try {
            setCreateModalState(prev => ({...prev, loading: true}));
            
            await fetchFunction('api/sportscomplex/clients', {
                method: 'post',
                data: {
                    name: name.trim(),
                    phone_number,
                    membership_number: membership_number.trim() || undefined
                }
            });
            
            notification({
                type: 'success',
                placement: 'top',
                title: 'Успіх',
                message: 'Клієнта успішно створено',
            });
            
            retryFetch('api/sportscomplex/clients/filter', {
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
                message: error?.response?.data?.message ? error.response.data.message : error.message,
                placement: 'top',
            });
        } finally {
            setCreateModalState(prev => ({...prev, loading: false}));
        }
    };

    const handleEditFormSubmit = async () => {
        const { name, phone_number, membership_number } = editModalState.formData;
        
        // Валідація форми
        if (!name || !phone_number || !membership_number) {
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
            
            await fetchFunction(`api/sportscomplex/clients/${editModalState.clientId}`, {
                method: 'put',
                data: {
                    name: name.trim(),
                    phone_number,
                    membership_number: membership_number.trim(),
                    subscription_duration: '30 днів'
                }
            });
            
            notification({
                type: 'success',
                placement: 'top',
                title: 'Успіх',
                message: 'Клієнта успішно оновлено',
            });
            
            retryFetch('api/sportscomplex/clients/filter', {
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
                message: error?.response?.data?.message ? error.response.data.message : error.message,
                placement: 'top',
            });
        } finally {
            setEditModalState(prev => ({...prev, loading: false}));
        }
    };

    
    const handleRenewSubscription = async () => {
        try {
            setConfirmModalState(prev => ({...prev, loading: true}));
            
            await fetchFunction(`api/sportscomplex/clients/${confirmModalState.clientId}/renew-subscription`, {
                method: 'put'
            });
            
            notification({
                type: 'success',
                placement: 'top',
                title: 'Успіх',
                message: 'Абонемент успішно оновлено',
            });
            
            retryFetch('api/sportscomplex/clients/filter', {
                method: 'post',
                data: state.sendData,
            });
            
            closeRenewModal();
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
            setConfirmModalState(prev => ({...prev, loading: false}));
        }
    };

   const handleStartLesson = async () => {
        try {
            setStartLessonModalState(prev => ({...prev, loading: true}));
            
            await fetchFunction(`api/sportscomplex/clients/${startLessonModalState.clientId}/start-lesson`, {
                method: 'put'
            });
            
            notification({
                type: 'success',
                placement: 'top',
                title: 'Успіх',
                message: 'Заняття успішно розпочато',
            });
            
            retryFetch('api/sportscomplex/clients/filter', {
                method: 'post',
                data: state.sendData,
            });
            
            closeStartLessonModal();
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
            setStartLessonModalState(prev => ({...prev, loading: false}));
        }
    };
    // ✅ ОНОВЛЕНИЙ useEffect для синхронізації з сервером
    useEffect(() => {
        if (isFirstRun.current) {
            isFirstRun.current = false;
            return;
        }
        
        // Очищаємо локальні дані перед новим запитом
        setLocalData(null);
        
        retryFetch('api/sportscomplex/clients/filter', {
            method: 'post',
            data: state.sendData,
        });
    }, [state.sendData, retryFetch]);

    if (status === STATUS.ERROR) {
        return <PageError title="Схоже, виникла проблема із завантаженням даних." statusError="500" />;
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
                                Додати клієнта
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
                                columns={Array.isArray(columns) ? columns.filter(Boolean) : []} 
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
                                    name="name" 
                                    placeholder="ПІБ клієнта" 
                                    value={state.selectData?.name || ''} 
                                    onChange={onHandleChange} 
                                />
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
            
            {/* Модальне вікно створення клієнта */}
            <Transition in={createModalState.isOpen} timeout={200} unmountOnExit nodeRef={addFormRef}>
                {transitionState => (
                    <Modal
                        className={transitionState === 'entered' ? "modal-window-wrapper--active" : ""}
                        onClose={closeCreateModal}
                        onOk={handleCreateFormSubmit}
                        confirmLoading={createModalState.loading}
                        cancelText="Скасувати"
                        okText="Зберегти"
                        title="Додати клієнта"
                        width="500px"
                    >
                        <div className="form-container">
                            <FormItem label="ПІБ клієнта" required fullWidth>
                                <Input
                                    name="name"
                                    placeholder="Введіть ПІБ"
                                    value={createModalState.formData.name}
                                    onChange={onCreateFormChange}
                                />
                            </FormItem>
                            <FormItem label="Номер телефону" required fullWidth>
                                <Input
                                    name="phone_number"
                                    placeholder="+38 099 662 88 60"
                                    value={createModalState.formData.phone_number}
                                    onChange={onCreateFormChange}
                                    maxLength={17}
                                />
                            </FormItem>
                            <FormItem label="Номер абонемента (необов'язково)" fullWidth>
                                <Input
                                    name="membership_number"
                                    placeholder="Залиште порожнім для автоматичної генерації"
                                    value={createModalState.formData.membership_number}
                                    onChange={onCreateFormChange}
                                />
                            </FormItem>
                            <div style={{ 
                                fontSize: '14px', 
                                color: '#666', 
                                marginTop: '15px',
                                padding: '10px',
                                backgroundColor: '#f5f5f5',
                                borderRadius: '4px',
                                border: '1px solid #ddd'
                            }}>
                                <strong>Інформація:</strong>
                                <br />
                                • Тривалість абонемента: 30 днів (встановлюється автоматично)
                                <br />
                                • Послуги будуть додані через створення рахунків
                                <br />
                                • Якщо номер абонемента не вказано, він буде згенерований автоматично
                                <br />
                                • Номер телефону автоматично форматується під український стандарт
                            </div>
                        </div>
                    </Modal>
                )}
            </Transition>

            {/* Модальне вікно редагування клієнта */}
            <Transition in={editModalState.isOpen} timeout={200} unmountOnExit nodeRef={editFormRef}>
                {transitionState => (
                    <Modal
                        className={transitionState === 'entered' ? "modal-window-wrapper--active" : ""}
                        onClose={closeEditModal}
                        onOk={handleEditFormSubmit}
                        confirmLoading={editModalState.loading}
                        cancelText="Скасувати"
                        okText="Зберегти зміни"
                        title="Редагувати клієнта"
                        width="500px"
                    >
                        <div className="form-container">
                            <FormItem label="ПІБ клієнта" required fullWidth>
                                <Input
                                    name="name"
                                    placeholder="Введіть ПІБ"
                                    value={editModalState.formData.name}
                                    onChange={onEditFormChange}
                                />
                            </FormItem>
                            <FormItem label="Номер телефону" required fullWidth>
                                <Input
                                    name="phone_number"
                                    placeholder="+38 099 662 88 60"
                                    value={editModalState.formData.phone_number}
                                    onChange={onEditFormChange}
                                    maxLength={17}
                                />
                            </FormItem>
                            <FormItem label="Номер абонемента" required fullWidth>
                                <Input
                                    name="membership_number"
                                    placeholder="Номер абонемента"
                                    value={editModalState.formData.membership_number}
                                    onChange={onEditFormChange}
                                />
                            </FormItem>
                            <div style={{ 
                                fontSize: '14px', 
                                color: '#666', 
                                marginTop: '15px',
                                padding: '10px',
                                backgroundColor: '#f5f5f5',
                                borderRadius: '4px',
                                border: '1px solid #ddd'
                            }}>
                                <strong>Примітка:</strong> Послуги та тривалість абонемента редагуються через інші розділи системи.
                            </div>
                        </div>
                    </Modal>
                )}
            </Transition>

            {/* Модальне вікно оновлення абонемента */}
            <Transition in={confirmModalState.isOpen} timeout={200} unmountOnExit nodeRef={confirmFormRef}>
                {transitionState => (
                    <Modal
                        className={transitionState === 'entered' ? "modal-window-wrapper--active" : ""}
                        onClose={closeRenewModal}
                        onOk={handleRenewSubscription}
                        confirmLoading={confirmModalState.loading}
                        cancelText="Ні"
                        okText="Так"
                        title="Підтвердження оновлення абонемента"
                        width="450px"
                    >
                        <div className="form-container">
                            <p className="paragraph">
                                Ви точно бажаєте оновити абонемент для клієнта <strong>{confirmModalState.clientName}</strong>?
                            </p>
                            <p className="paragraph">
                                Після підтвердження абонемент буде оновлено на 30 днів і відлік почнеться заново.
                            </p>
                        </div>
                    </Modal>
                )}
            </Transition>

            {/* Модальне вікно початку заняття */}
            <Transition in={startLessonModalState.isOpen} timeout={200} unmountOnExit nodeRef={startLessonFormRef}>
                {transitionState => (
                    <Modal
                        className={transitionState === 'entered' ? "modal-window-wrapper--active" : ""}
                        onClose={closeStartLessonModal}
                        onOk={handleStartLesson}
                        confirmLoading={startLessonModalState.loading}
                        cancelText="Скасувати"
                        okText="Розпочати заняття"
                        title="Підтвердження початку заняття"
                        width="450px"
                    >
                        <div className="form-container">
                            <p className="paragraph">
                                Ви хочете розпочати заняття для клієнта <strong>{startLessonModalState.clientName}</strong>?
                            </p>
                            <p className="paragraph">
                                Поточна кількість доступних відвідувань: <strong>{startLessonModalState.remainingVisits}</strong>
                            </p>
                            <p className="paragraph" style={{ color: '#666', fontSize: '14px' }}>
                                Після підтвердження кількість відвідувань зменшиться на 1.
                            </p>
                        </div>
                    </Modal>
                )}
            </Transition>
        </>
    );
};

export default Clients;