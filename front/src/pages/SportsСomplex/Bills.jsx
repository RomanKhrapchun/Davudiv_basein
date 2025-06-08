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
    
    // Стан для модального вікна створення рахунку
    const [createModalState, setCreateModalState] = useState({
        isOpen: false,
        loading: false,
        formData: {
            client_name: '',
            membership_number: '',
            phone_number: '',
            service_group_id: '',
            service_id: '',
            visit_count: '',
            price: 0,
            total_price: 0,
        },
        serviceGroups: [],
        services: [],
        searchResults: [], // Результати пошуку клієнтів
    });

    // Стан для модального вікна редагування
    const [editModalState, setEditModalState] = useState({
        isOpen: false,
        loading: false,
        billId: null,
        formData: {
            client_name: '',
            membership_number: '',
            phone_number: '',
            service_group_id: '',
            service_id: '',
            visit_count: '',
            price: 0,
            total_price: 0,
        },
        serviceGroups: [],
        services: [],
        searchResults: [],
    });
    
    // Стан для модального вікна вибору клієнта
    const [clientSelectModalState, setClientSelectModalState] = useState({
        isOpen: false,
        clients: [],
        onSelect: null,
        modalType: 'create' // 'create' або 'edit'
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

    // Функція пошуку клієнтів по ПІБ
    const searchClientsByName = async (name) => {
        if (!name || name.length < 3) return [];
        
        try {
            const response = await fetchFunction(`/api/sportscomplex/clients/search`, {
                method: 'post',
                data: { name }
            });
            
            return response?.data || [];
        } catch (error) {
            console.error('Помилка пошуку клієнтів:', error);
            return [];
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

    // Визначення колонок таблиці
    const columnTable = useMemo(() => [
        {
            title: 'Номер абонемента',
            dataIndex: 'membership_number',
            width: '12%'
        },
        {
            title: 'ПІБ клієнта',
            dataIndex: 'client_name',
            width: '15%'
        },
        {
            title: 'Номер телефону',
            dataIndex: 'phone_number',
            width: '12%'
        },
        {
            title: 'Група послуг',
            dataIndex: 'service_group',
            width: '12%'
        },
        {
            title: 'Послуга',
            dataIndex: 'service_name',
            width: '15%'
        },
        {
            title: 'Кількість відвідувань',
            dataIndex: 'visit_count',
            width: '10%'
        },
        {
            title: 'Ціна',
            dataIndex: 'total_price',
            width: '10%',
            render: (price) => `${price} грн`
        },
        {
            title: 'Дія',
            dataIndex: 'action',
            width: '14%',
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

    // Підготовка даних для таблиці
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
            total_price: el.total_price
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

    // Функції для модального вікна створення
    const onCreateFormChange = async (name, value) => {
        setCreateModalState(prev => {
            const updatedFormData = { ...prev.formData, [name]: value };
            return { ...prev, formData: updatedFormData };
        });

        // Якщо змінюється ПІБ клієнта, шукаємо клієнтів
        if (name === 'client_name' && value.length >= 3) {
            const clients = await searchClientsByName(value);
            if (clients.length > 1) {
                // Якщо знайдено кілька клієнтів, показуємо модальне вікно вибору
                setClientSelectModalState({
                    isOpen: true,
                    clients: clients,
                    modalType: 'create',
                    onSelect: (selectedClient) => {
                        setCreateModalState(prev => ({
                            ...prev,
                            formData: {
                                ...prev.formData,
                                client_name: selectedClient.name,
                                membership_number: selectedClient.membership_number,
                                phone_number: selectedClient.phone_number
                            }
                        }));
                    }
                });
            } else if (clients.length === 1) {
                // Якщо знайдено одного клієнта, автоматично заповнюємо поля
                setCreateModalState(prev => ({
                    ...prev,
                    formData: {
                        ...prev.formData,
                        membership_number: clients[0].membership_number,
                        phone_number: clients[0].phone_number
                    }
                }));
            }
        }
    };

    // Функції для модального вікна редагування
    const onEditFormChange = async (name, value) => {
        setEditModalState(prev => {
            const updatedFormData = { ...prev.formData, [name]: value };
            return { ...prev, formData: updatedFormData };
        });

        // Аналогічна логіка для редагування
        if (name === 'client_name' && value.length >= 3) {
            const clients = await searchClientsByName(value);
            if (clients.length > 1) {
                setClientSelectModalState({
                    isOpen: true,
                    clients: clients,
                    modalType: 'edit',
                    onSelect: (selectedClient) => {
                        setEditModalState(prev => ({
                            ...prev,
                            formData: {
                                ...prev.formData,
                                client_name: selectedClient.name,
                                membership_number: selectedClient.membership_number,
                                phone_number: selectedClient.phone_number
                            }
                        }));
                    }
                });
            } else if (clients.length === 1) {
                setEditModalState(prev => ({
                    ...prev,
                    formData: {
                        ...prev.formData,
                        membership_number: clients[0].membership_number,
                        phone_number: clients[0].phone_number
                    }
                }));
            }
        }
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

    // Обробка вибору послуги
    const handleServiceChange = (name, option, modalType = 'create') => {
        if (!option) return;
        
        const services = modalType === 'create' ? createModalState.services : editModalState.services;
        const serviceOption = services.find(
            service => service.value === (typeof option === 'object' ? option.value : option)
        );
        
        if (serviceOption) {
            const { label, visit_count, price } = serviceOption;

            if (modalType === 'create') {
                setCreateModalState(prev => ({
                    ...prev,
                    formData: {
                        ...prev.formData,
                        service_id: option,
                        visit_count,
                        price,
                        total_price: price
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
                        total_price: price
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

    // Функції для модального вікна створення
    const openCreateModal = () => {
        setCreateModalState(prev => ({
            ...prev,
            isOpen: true,
            formData: {
                client_name: '',
                membership_number: '',
                phone_number: '',
                service_group_id: '',
                service_id: '',
                visit_count: '',
                price: 0,
                total_price: 0
            }
        }));
        document.body.style.overflow = 'hidden';
    };
    
    const closeCreateModal = () => {
        setCreateModalState(prev => ({ ...prev, isOpen: false }));
        document.body.style.overflow = 'auto';
    };

    // Функції для модального вікна редагування
    const handleOpenEditModal = async (bill) => {
        // Завантажуємо повні дані рахунку
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
                    client_name: billData.client_name,
                    membership_number: billData.membership_number,
                    phone_number: billData.phone_number,
                    service_group_id: { value: billData.service_group_id, label: billData.service_group },
                    service_id: { value: billData.service_id, label: billData.service_name },
                    visit_count: billData.visit_count,
                    price: billData.price,
                    total_price: billData.total_price
                }
            }));
            
            // Завантажуємо послуги для групи
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

    // Функція для створення рахунку
    const handleCreateFormSubmit = async () => {
        const { client_name, membership_number, phone_number, service_id } = createModalState.formData;
        
        if (!client_name || !membership_number || !phone_number || !service_id) {
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
            
            const serviceIdValue = typeof service_id === 'object' ? service_id.value : service_id;
            
            await fetchFunction('/api/sportscomplex/bills', {
                method: 'post',
                data: {
                    client_name,
                    membership_number,
                    phone_number,
                    service_id: serviceIdValue
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

    // Функція для редагування рахунку
    const handleEditFormSubmit = async () => {
        const { client_name, membership_number, phone_number, service_id } = editModalState.formData;
        
        if (!client_name || !membership_number || !phone_number || !service_id) {
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
                    client_name,
                    membership_number,
                    phone_number,
                    service_id: serviceIdValue
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
                                `Показує ${startRecord}-${endRecord} з ${data?.totalItems}` : 
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
            
            {/* Модальне вікно для створення нового рахунку */}
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
                        width="600px"
                    >
                        <div className="form-container">
                            <FormItem 
                                label="ПІБ клієнта" 
                                required 
                                fullWidth
                            >
                                <Input
                                    name="client_name"
                                    value={createModalState.formData.client_name}
                                    onChange={onCreateFormChange}
                                    placeholder="Введіть ПІБ клієнта"
                                />
                            </FormItem>
                            
                            <FormItem 
                                label="Номер абонемента" 
                                required 
                                fullWidth
                            >
                                <Input
                                    name="membership_number"
                                    value={createModalState.formData.membership_number}
                                    onChange={onCreateFormChange}
                                    placeholder="Автоматично заповнюється"
                                    disabled={true}
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
                                    placeholder="Автоматично заповнюється"
                                    disabled={true}
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
                        </div>
                    </Modal>
                )}
            </Transition>
            
            {/* Модальне вікно для редагування рахунку */}
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
                        width="600px"
                    >
                        <div className="form-container">
                            <FormItem 
                                label="ПІБ клієнта" 
                                required 
                                fullWidth
                            >
                                <Input
                                    name="client_name"
                                    value={editModalState.formData.client_name}
                                    onChange={onEditFormChange}
                                    placeholder="Введіть ПІБ клієнта"
                                />
                            </FormItem>
                            
                            <FormItem 
                                label="Номер абонемента" 
                                required 
                                fullWidth
                            >
                                <Input
                                    name="membership_number"
                                    value={editModalState.formData.membership_number}
                                    onChange={onEditFormChange}
                                    placeholder="Автоматично заповнюється"
                                    disabled={true}
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
                                    disabled={true}
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
                        </div>
                    </Modal>
                )}
            </Transition>
            
            {/* Модальне вікно для вибору клієнта */}
            <Transition in={clientSelectModalState.isOpen} timeout={200} unmountOnExit nodeRef={clientSelectRef}>
                {transitionState => (
                    <Modal
                        className={transitionState === 'entered' ? "modal-window-wrapper--active" : ""}
                        onClose={closeClientSelectModal}
                        cancelText="Скасувати"
                        title="Виберіть клієнта"
                        width="500px"
                        showOkButton={false}
                    >
                        <div className="client-select-container">
                            <p className="paragraph">Знайдено кілька клієнтів з таким ПІБ. Виберіть потрібного:</p>
                            <div className="client-list">
                                {clientSelectModalState.clients.map((client, index) => (
                                    <div 
                                        key={index} 
                                        className="client-item"
                                        onClick={() => handleClientSelect(client)}
                                        style={{
                                            padding: '12px',
                                            border: '1px solid #ddd',
                                            borderRadius: '6px',
                                            marginBottom: '8px',
                                            cursor: 'pointer',
                                            transition: 'background-color 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                    >
                                        <div><strong>{client.name}</strong></div>
                                        <div>Телефон: {client.phone_number}</div>
                                        <div>Абонемент: {client.membership_number}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Modal>
                )}
            </Transition>
        </>
    );
};

export default Bills;