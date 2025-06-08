import React, { useCallback, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Context } from '../../main';
import { useNotification } from "../../hooks/useNotification";
import Input from "../../components/common/Input/Input";
import Button from "../../components/common/Button/Button";
import Select from "../../components/common/Select/Select";
import { fetchFunction, handleKeyDown } from "../../utils/function";
import { generateIcon, iconMap } from "../../utils/constants";
import FormItem from "../../components/common/FormItem/FormItem";
import Loader from "../../components/Loader/Loader";

const onBackIcon = generateIcon(iconMap.back)
const onSaveIcon = generateIcon(iconMap.save)

const AccountCreate = () => {
    const navigate = useNavigate();
    const notification = useNotification();
    const { store } = useContext(Context);
    const [loading, setLoading] = useState(false);
    const [services, setServices] = useState([]);
    const [selectedService, setSelectedService] = useState(null);
    
    console.log('Store user:', store.user);

    const generateAccountNumber = () => {
        // Ensure we always get a 6-digit number by padding with leading zeros if needed
        const randomNum = Math.floor(100000 + Math.random() * 900000);
        return randomNum.toString().padStart(6, '0');
    };

    const [formData, setFormData] = useState({
        account_number: generateAccountNumber(),
        service_id: '',
        service_code: '',
        payer: '',
        amount: '',
        administrator: store.user?.fullName || ''
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        console.log('Store user in effect:', store.user);
        if (store.user?.fullName) {
            setFormData(prev => ({
                ...prev,
                administrator: store.user.fullName
            }));
        }
    }, [store.user?.fullName]);

    useEffect(() => {
        const fetchServices = async () => {
            try {
                const response = await fetchFunction('api/cnap/services/filter', {
                    method: 'post',
                    data: {
                        page: 1,
                        limit: 100
                    }
                });
                
                if (response?.data?.items) {
                    const mappedServices = response.data.items.map(service => ({
                        value: service.id,
                        label: service.name,
                        price: service.price,
                        identifier: service.identifier
                    }));
                    console.log('Mapped services:', mappedServices);
                    setServices(mappedServices);
                } else {
                    console.error('Unexpected response structure:', response);
                    notification({
                        type: 'error',
                        message: 'Помилка при завантаженні списку послуг',
                        placement: 'top'
                    });
                }
            } catch (error) {
                console.error('Service loading error:', error);
                notification({
                    type: 'error',
                    message: 'Помилка при завантаженні списку послуг',
                    placement: 'top'
                });
            }
        };
        fetchServices();
    }, [notification]);

    const handleInputChange = useCallback((name, value) => {
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    }, [errors]);

    const handleServiceChange = useCallback((value, option) => {
        console.log('Selected service:', { value, option }); // Для дебагу
        if (option) {
            setSelectedService(option);
            setFormData(prev => ({
                ...prev,
                service_id: option.value,
                service_code: option.identifier,
                amount: option.price,
                service_name: option.label
            }));
        }
    }, []);

    const validateForm = () => {
        const newErrors = {};
        
        if (!formData.account_number) {
            newErrors.account_number = "Обов'язкове поле";
        } else if (!/^\d{6}$/.test(formData.account_number)) {
            newErrors.account_number = "Номер рахунку має містити 6 цифр";
        }

        if (!formData.service_id || !selectedService) {
            newErrors.service_id = "Обов'язкове поле";
        }

        if (!formData.payer) {
            newErrors.payer = "Обов'язкове поле";
        }

        if (!formData.amount) {
            newErrors.amount = "Обов'язкове поле";
        }

        console.log('Form data:', formData); // Для дебагу
        console.log('Validation errors:', newErrors); // Для дебагу
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const onBackClick = useCallback((e) => {
        e.preventDefault();
        navigate('/cnap/accounts');
    }, [navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log('Submitting form with data:', formData);
        
        // Перевіряємо і встановлюємо адміністратора перед валідацією
        if (store.user?.fullName && !formData.administrator) {
            setFormData(prev => ({
                ...prev,
                administrator: store.user.fullName
            }));
        }

        if (!validateForm()) return;

        try {
            setLoading(true);
            const currentDate = new Date();
            const timeString = currentDate.toLocaleTimeString('uk-UA', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
                timeZone: 'Europe/Kiev'
            });
            
            const submitData = {
                ...formData,
                administrator: store.user?.fullName || formData.administrator,
                date: currentDate.toISOString().split('T')[0],
                time: timeString
            };

            console.log('Sending data to server:', submitData);

            const response = await fetchFunction('api/cnap/accounts', {
                method: 'post',
                data: submitData
            });

            if (response?.error) {
                throw new Error(response.error);
            }

            notification({
                type: 'success',
                message: 'Рахунок успішно створено',
                placement: 'top'
            });
            navigate('/cnap/accounts');
        } catch (error) {
            console.error('Submit error:', error);
            let errorMessage = 'Помилка при створенні рахунку';
            
            if (error.message.includes('permission denied')) {
                errorMessage = 'У вас немає прав для створення рахунку. Зверніться до адміністратора системи.';
            } else if (error.message.includes('database')) {
                errorMessage = 'Помилка бази даних. Будь ласка, спробуйте пізніше.';
            }

            notification({
                type: 'error',
                message: error?.response?.data?.message || errorMessage,
                placement: 'top'
            });
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <Loader />;
    }

    return (
        <form onKeyDown={handleKeyDown} onSubmit={handleSubmit}>
            <div className="components-container">
                <FormItem
                    label="Номер рахунку"
                    fullWidth
                    htmlFor="account_number_input"
                >
                    <Input
                        id="account_number_input"
                        name="account_number"
                        value={formData.account_number}
                        disabled={true}
                        autoComplete="off"
                    />
                </FormItem>

                <FormItem
                    label="Послуга"
                    error={errors.service_id}
                    required
                >
                    <Select
                        placeholder={selectedService ? selectedService.label : "Виберіть послугу"}
                        value={formData.service_id}
                        onChange={handleServiceChange}
                        options={services}
                    />
                </FormItem>

                <FormItem
                    label="Код послуги"
                    fullWidth
                >
                    <Input
                        value={formData.service_code}
                        disabled
                    />
                </FormItem>

                <FormItem
                    label="Платник"
                    error={errors.payer}
                    required
                    fullWidth
                >
                    <Input
                        name="payer"
                        value={formData.payer}
                        onChange={handleInputChange}
                    />
                </FormItem>

                <FormItem
                    label="Сума"
                    error={errors.amount}
                    required
                    fullWidth
                >
                    <Input
                        name="amount"
                        value={formData.amount}
                        onChange={handleInputChange}
                        disabled
                    />
                </FormItem>

                <FormItem
                    label="Адміністратор"
                    fullWidth
                >
                    <Input
                        value={formData.administrator}
                        disabled
                    />
                </FormItem>

                <div className="btn-group">
                    <Button
                        type="default"
                        icon={onBackIcon}
                        onClick={onBackClick}
                    >
                        Назад
                    </Button>
                    <Button
                        type="primary"
                        icon={onSaveIcon}
                        htmlType="submit"
                    >
                        Зберегти
                    </Button>
                </div>
            </div>
        </form>
    );
}

export default AccountCreate;
