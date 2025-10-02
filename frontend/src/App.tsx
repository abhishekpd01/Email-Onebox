import { useState, useEffect } from 'react';
import { fetchEmails, type Email } from './api/emails';
import SearchBar from './components/SearchBar';
import EmailList from './components/EmailList';
import './App.css';

// IMPORTANT: Replace these with the email accounts you configured in your backend's .env file
const CONFIGURED_ACCOUNTS = [
  import.meta.env.VITE_IMAP_USER_1 || 'your_first_email@gmail.com',
  import.meta.env.VITE_IMAP_USER_2 || 'your_second_email@gmail.com',
];

function App() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [accountFilter, setAccountFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handler = setTimeout(() => {
      setIsLoading(true);
      
      // No more searching for ' '. Just send the actual query, even if empty.
      // The backend will now correctly return all emails if the query is empty.
      fetchEmails(searchQuery, accountFilter).then((data) => {
        setEmails(data);
        setIsLoading(false);
      });
    }, 300); // Reduced debounce timer for a snappier feel

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery, accountFilter]);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Onebox</h1>
      </header>
      <main>
        <SearchBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          accountFilter={accountFilter}
          setAccountFilter={setAccountFilter}
          accounts={CONFIGURED_ACCOUNTS}
        />
        <EmailList emails={emails} isLoading={isLoading} />
      </main>
    </div>
  );
}

export default App;