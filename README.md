# **AI-Powered Email Onebox**

The system is composed of a Node.js (TypeScript) backend for data processing and a React frontend for user interaction.

## **✨ Features**

This project has following outlined features:

* **✅ Real-Time Email Synchronization:** Connects to and syncs multiple IMAP accounts (e.g., Gmail, Outlook) in real-time using persistent IMAP IDLE connections. Fetches the last 30 days of emails on initial sync.  
* **✅ Searchable Storage with Elasticsearch:** All emails are indexed into a cloud hosted Elasticsearch instance, enabling fast, full-text search capabilities. The API supports filtering by account.  
* **✅ AI-Based Email Categorization:** Incoming emails are automatically categorized using Google's Gemini Pro model into one of five labels: Interested, Not Interested, Meeting Booked, Spam, or Out of Office.  
* **✅ Slack & Webhook Integration:** Sends real-time notifications to a configured Slack channel and a generic webhook URL (webhook.site) whenever an email is categorized as Interested.  
* **✅ Simple & Functional Frontend:** A clean user interface built with React to display emails, filter by account, and show AI-generated categories with colored tags. Features basic search functionality powered by the Elasticsearch backend.  
* **✅ AI-Powered Suggested Replies (RAG):** A complete Retrieval-Augmented Generation (RAG) pipeline using **LangChain.js**, **Pinecone** for vector storage, and a powerful LLM (using **Google Vertex AI**) to generate context-aware reply suggestions.

## **⚙️ Tech Stack**

**Backend:**

* **Runtime:** Node.js  
* **Language:** TypeScript  
* **Framework:** Express.js  
* **IMAP:** node-imap, mailparser  
* **AI & RAG:** LangChain.js, Google Gemini, OpenAI, Pinecone  
* **Database:** Elasticsearch

**Frontend:**

* **Library:** React  
* **Language:** TypeScript  
* **Build Tool:** Vite  
* **API Client:** Axios

**Services & Tools:**

* **Testing:** Postman

## **📋 Prerequisites**

Before you begin, ensure you have the following installed and configured:

1. **Node.js:** v18.x or later.  
2. **Postman:** For testing the backend API endpoints.  
3. **IMAP App Passwords:** For each email account you want to sync (e.g., Gmail, Outlook), you **must** generate an App Password. Your regular password will not work.  
4. **External Service Accounts:**  
   * **Pinecone:** A free account to create a vector index.  
   * **OpenAI or Google Cloud (Vertex AI):** An API key for your chosen LLM and embedding provider.  
   * **Slack:** A generated Incoming Webhook URL.  
   * **Webhook.site:** A URL for testing generic webhooks.

## **🚀 Getting Started**

Follow these steps to get the project running locally.

### **1\. Clone the Repository**

git clone \<your-repository-url\>  
cd \<your-repository-name\>

### **2\. Configure the Backend**

1. Navigate to the backend directory:  
   cd backend

2. Create a .env file by copying the example. This file will hold all your secret keys and configurations.  
   cp .env.example .env

3. Open the .env file and fill in all the required values:  
   \# IMAP Account 1  
   IMAP_HOST_1=imap.gmail.com  
   IMAP_PORT_1=993  
   IMAP_USER_1=your-first-email@gmail.com  
   IMAP_PASSWORD_1=your-gmail-app-password

   \# IMAP Account 2  
   IMAP_HOST_2=outlook.office365.com  
   IMAP_PORT_2=993  
   IMAP_USER_2=your-second-email@gmail.com  
   IMAP_PASSWORD_2=your-outlook-app-password

   \# Elasticsearch  
   ELASTICSEARCH_URL=<your_url>

   \# AI Provider (use one)  
   GEMINI_API_KEY=your_gemini_api_key  
   OPENAI_API_KEY=sk-your_openai_api_key

   \# Pinecone  
   PINECONE_API_KEY=your_pinecone_api_key  
   PINECONE_ENVIRONMENT=your_pinecone_environment_name

   \# Notifications  
   SLACK_WEBHOOK_URL=your_slack_webhook_url  
   WEBHOOK_SITE_URL=your_webhook_site_url

   \# For GCP  
   GOOGLE_APPLICATION_CREDENTIALS=<credential_file_path>
   GCP_PROJECT_ID=<project_id>

5. Install backend dependencies and run the server:  
   npm install  
   npm run dev \# Or npx ts-node src/index.ts

   The backend server should now be running on http://localhost:3000.

### **4\. Configure the Frontend**

1. Open a **new terminal window** and navigate to the frontend directory:  
   cd frontend

2. **Important:** Open src/App.tsx and update the CONFIGURED\_ACCOUNTS array with the email addresses you set in the backend .env file. This populates the filter dropdown.  
3. Install frontend dependencies and run the development server:  
   npm install  
   npm run dev

   The frontend should now be accessible at http://localhost:5173 (or another port specified by Vite).

## **🎛️ API Usage (Postman Guide)**

Here’s how to test the core API endpoints.

#### **Search Emails**

* **URL:** http://localhost:3000/api/search  
* **Method:** GET  
* **Params:**  
  * q (optional): The search term (e.g., welcome).  
  * account (optional): The email account to filter by (e.g., your-first-email@gmail.com).

#### **Add RAG Agenda (Training Data)**

* **URL:** http://localhost:3000/api/agenda  
* **Method:** POST  
* **Body** (raw, JSON):  
  {  
    "text": "I am applying for a job position. If the lead is interested, share the meeting booking link: \[https://cal.com/example\](https://cal.com/example)"  
  }

#### **Suggest a Reply**

* **URL:** http://localhost:3000/api/suggest-reply  
* **Method:** POST  
* **Body** (raw, JSON):  
  {  
    "emailContent": "Hi, Your resume has been shortlisted. When will be a good time for you to attend the technical interview?"  
  }
