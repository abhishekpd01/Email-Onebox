import React from 'react';
import type { Email } from '../api/emails';
import EmailItem from './EmailItem';

interface EmailListProps {
  emails: Email[];
  isLoading: boolean;
}

const EmailList: React.FC<EmailListProps> = ({ emails, isLoading }) => {
  if (isLoading) {
    return <div className="message">Loading emails...</div>;
  }

  if (emails.length === 0) {
    return <div className="message">No emails found.</div>;
  }

  return (
    <div className="email-list">
      {emails.map((email) => (
        <EmailItem key={email.messageId} email={email} />
      ))}
    </div>
  );
};

export default EmailList;