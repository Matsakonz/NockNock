# WhoPay (NockNock!)

WhoPay is a modern, responsive bill-splitting application designed for groups, trips, and shared expenses. It helps you track who owes whom, calculate complex splits (including taxes and discounts), and even generates PromptPay QR codes for easy settlements.

## 🚀 Features

- **Quick Add:** Easily record simple expenses shared among group members.
- **Split Bill:** Handle complex bills with individual items, service charges, and VAT.
- **Cloud Sync:** Powered by Supabase for real-time data synchronization across devices.
- **Offline Support:** LocalStorage fallback ensures your data is safe even without a connection.
- **PromptPay Integration:** Generate QR codes for instant payments with pre-filled amounts.
- **Image Support:** Attach and store receipt photos for better record-keeping.
- **Multiple Trips:** Manage different groups or events separately.

## 🛠️ Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS
- **Icons:** Lucide React
- **Database & Sync:** Supabase
- **UI Components:** SweetAlert2, Custom Tailwind Components

## 🏁 Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- A Supabase account (for cloud sync)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd whopay
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_APP_ID=your_unique_app_id
   ```

4. **Setup Database:**
   Follow the instructions in [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) to create the necessary tables and policies in your Supabase project.

5. **Run the development server:**
   ```bash
   npm run dev
   ```

## 📖 Usage

1. **Create a Trip:** Start by naming your event or group.
2. **Add Members:** Add friends who will be sharing expenses.
3. **Record Expenses:**
   - Use **Quick Add** for simple shared costs.
   - Use **Split Bill** to itemize a receipt and assign items to specific people.
4. **Settle Up:** View the dashboard to see balances. Click on a member to see who they need to pay or receive money from.
5. **QR Payments:** If a member has a PromptPay number saved, you can generate a QR code for their debt directly in the app.

## 📄 License

MIT License - feel free to use and modify for your own needs.
