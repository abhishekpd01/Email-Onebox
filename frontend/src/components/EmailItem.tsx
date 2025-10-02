import React from 'react';
import type { Email } from '../api/emails';

interface EmailItemProps {
  email: Email;
}

const EmailItem: React.FC<EmailItemProps> = ({ email }) => {
  const getCategoryClass = (category: string) => {
    return category?.toLowerCase().replace(' ', '-') || 'default';
  };

  return (
    <div className="email-item">
      <div className="email-header">
        <span className="email-from">{email.from?.value[0]?.name || email.from?.value[0]?.address}</span>
        <span className={`email-category ${getCategoryClass(email.category)}`}>{email.category}</span>
      </div>
      <div className="email-subject">{email.subject}</div>
      <div className="email-snippet">{email.text?.substring(0, 100)}...</div>
    </div>
  );
};

export default EmailItem;