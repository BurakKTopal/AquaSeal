import React, { useState } from 'react';
import Input from '../../common/Input';
import styles from './MetadataForm.module.css';
import { MetadataInput } from '../../../types/metadata';

interface MetadataFormProps {
  onSubmit: (metadata: MetadataInput) => void;
  loading?: boolean;
  disabled?: boolean;
}

const MetadataForm: React.FC<MetadataFormProps> = ({ onSubmit, loading, disabled }) => {
  const [formData, setFormData] = useState<MetadataInput>({
    user_id: '',
    personal_info: '',
    license: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: keyof MetadataInput, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.user_id.trim()) {
      newErrors.user_id = 'User ID is required';
    }

    if (!formData.license.trim()) {
      newErrors.license = 'License is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  return (
    <form className={styles.metadataForm} onSubmit={handleSubmit}>
      <h3 className={styles.title}>Metadata Information</h3>
      
      <Input
        label="User ID *"
        value={formData.user_id}
        onChange={(e) => handleChange('user_id', e.target.value)}
        error={errors.user_id}
        placeholder="Enter your user ID"
        required
        disabled={loading || disabled}
      />

      <div className={styles.formGroup}>
        <label className={styles.label}>Personal Information (Optional)</label>
        <textarea
          className={styles.textarea}
          value={formData.personal_info || ''}
          onChange={(e) => handleChange('personal_info', e.target.value)}
          placeholder="Enter personal information"
          rows={4}
          disabled={loading || disabled}
        />
      </div>

      <Input
        label="License *"
        value={formData.license}
        onChange={(e) => handleChange('license', e.target.value)}
        error={errors.license}
        placeholder="e.g., CC BY 4.0, All Rights Reserved"
        required
        disabled={loading || disabled}
      />

      <button
        type="submit"
        className={styles.submit}
        disabled={loading || disabled}
      >
        {loading ? 'Processing...' : 'Watermark File'}
      </button>
    </form>
  );
};

export default MetadataForm;

