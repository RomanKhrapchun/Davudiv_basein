import React, {useCallback, useContext, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {Context} from '../../main';
import {useNotification} from "../../hooks/useNotification";
import Input from "../../components/common/Input/Input";
import Button from "../../components/common/Button/Button";
import {fetchFunction, handleKeyDown} from "../../utils/function";
import {generateIcon, iconMap} from "../../utils/constants";
import FormItem from "../../components/common/FormItem/FormItem";
import Loader from "../../components/Loader/Loader";

const onBackIcon = generateIcon(iconMap.back)
const onSaveIcon = generateIcon(iconMap.save)

const ServiceCreate = () => {
    const navigate = useNavigate();
    const notification = useNotification();
    const {store} = useContext(Context);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        identifier: '',
        name: '',
        price: '',
        edrpou: '',
        iban: ''
    });
    const [errors, setErrors] = useState({});

    const handleInputChange = useCallback((name, value) => {
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    }, [errors]);

    const validateForm = () => {
        const newErrors = {};
        if (!formData.identifier) newErrors.identifier = "Обов'язкове поле";
        if (!formData.name) newErrors.name = "Обов'язкове поле";
        if (!formData.price) newErrors.price = "Обов'язкове поле";
        if (!formData.edrpou) newErrors.edrpou = "Обов'язкове поле";
        if (!formData.iban) newErrors.iban = "Обов'язкове поле";
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const onBackClick = (e) => {
        e.preventDefault();
        navigate('/cnap/services');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            notification({
                type: 'warning',
                title: 'Помилка',
                message: 'Будь ласка, заповніть всі обов\'язкові поля',
                placement: 'top'
            });
            return;
        }

        try {
            setLoading(true);
            const response = await fetchFunction('api/cnap/services', {
                method: 'post',
                data: formData
            });

            notification({
                type: 'success',
                title: 'Успіх',
                message: 'Послугу успішно додано',
                placement: 'top'
            });

            navigate('/cnap/services');
        } catch (error) {
            notification({
                type: 'error',
                title: 'Помилка',
                message: error?.response?.data?.message || 'Помилка при створенні послуги',
                placement: 'top'
            });
            
            if (error?.response?.status === 401) {
                store.logOff();
                navigate('/');
            }
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
                    label="Ідентифікатор"
                    tooltip="Унікальний ідентифікатор послуги"
                    error={errors.identifier}
                    required
                    fullWidth
                    htmlFor="identifier_input"
                >
                    <Input
                        type="text"
                        className="half-width"
                        name="identifier"
                        value={formData.identifier}
                        onChange={handleInputChange}
                        autoComplete="off"
                    />
                </FormItem>

                <FormItem
                    label="Назва послуги"
                    tooltip="Повна назва послуги"
                    error={errors.name}
                    required
                    fullWidth
                    htmlFor="name_input"
                >
                    <Input
                        type="text"
                        className="half-width"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        autoComplete="off"
                    />
                </FormItem>

                <FormItem
                    label="Вартість"
                    tooltip="Вартість послуги в гривнях"
                    error={errors.price}
                    required
                    fullWidth
                    htmlFor="price_input"
                >
                    <Input
                        type="number"
                        className="half-width"
                        name="price"
                        value={formData.price}
                        onChange={handleInputChange}
                        autoComplete="off"
                    />
                </FormItem>

                <FormItem
                    label="ЄДРПОУ"
                    tooltip="Код ЄДРПОУ організації"
                    error={errors.edrpou}
                    required
                    fullWidth
                    htmlFor="edrpou_input"
                >
                    <Input
                        type="text"
                        className="half-width"
                        name="edrpou"
                        value={formData.edrpou}
                        onChange={handleInputChange}
                        autoComplete="off"
                    />
                </FormItem>

                <FormItem
                    label="IBAN"
                    tooltip="Номер банківського рахунку в форматі IBAN"
                    error={errors.iban}
                    required
                    fullWidth
                    htmlFor="iban_input"
                >
                    <Input
                        type="text"
                        className="half-width"
                        name="iban"
                        value={formData.iban}
                        onChange={handleInputChange}
                        autoComplete="off"
                    />
                </FormItem>

                <div className="form-actions">
                    <Button
                        type="submit"
                        icon={onSaveIcon}
                    >
                        Зберегти
                    </Button>
                    <Button
                        type="button"
                        onClick={onBackClick}
                        icon={onBackIcon}
                        className="btn--secondary"
                    >
                        Назад
                    </Button>
                </div>
            </div>
        </form>
    );
};

export default ServiceCreate;
