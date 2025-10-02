import React from 'react';

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  accountFilter: string;
  setAccountFilter: (account: string) => void;
  accounts: string[];
}

const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  setSearchQuery,
  accountFilter,
  setAccountFilter,
  accounts,
}) => {
  return (
    <div className="search-bar">
      <input
        type="text"
        placeholder="Search emails..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="search-input"
      />
      <select
        value={accountFilter}
        onChange={(e) => setAccountFilter(e.target.value)}
        className="account-filter"
      >
        <option value="">All Accounts</option>
        {accounts.map((acc) => (
          <option key={acc} value={acc}>
            {acc}
          </option>
        ))}
      </select>
    </div>
  );
};

export default SearchBar;