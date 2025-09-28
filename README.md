# Problem Statement Registration Website

A React-based web application for team registration and problem statement selection with Firebase backend integration.

## 🚀 Features

### User Side
- **Team Registration Form**: Collects Team Number, Team Name, and Team Leader Name
- **Problem Statement Cards**: Displays available problem statements in an attractive card layout
- **Selection Limits**: Each problem statement can only be selected by 3 teams maximum
- **Real-time Updates**: Cards are automatically disabled when limit is reached
- **Success Notifications**: Confirmation messages after successful registration
- **Responsive Design**: Works seamlessly on desktop and mobile devices

### Admin Side
- **Dashboard View**: Table displaying all registrations
- **PDF Export**: Download registration data in PDF format
- **Real-time Data**: Live updates from Firebase database
- **Registration Statistics**: Shows total registrations and team counts per problem

## 🛠️ Technologies Used

- **Frontend**: React 19.1.1 with JSX
- **Styling**: Bootstrap 5 for responsive design
- **Routing**: React Router DOM
- **Database**: Firebase Firestore
- **PDF Generation**: jsPDF with AutoTable
- **Build Tool**: Create React App

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd problem-statement-website
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Firebase Setup**
   - Firebase is already configured with project: owasp-78ee6
   - Firestore Database is connected and ready to use
   - Configuration is set in `src/firebase.js`

4. **Start the development server**
   ```bash
   npm start
   ```

5. **Open your browser**
   - Navigate to `http://localhost:3000`

## 🔥 Firebase Configuration

The Firebase configuration is set up with the following credentials:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyDPwT0s2xR1u1cgZwEBzSL8EizxF09md9o",
  authDomain: "owasp-78ee6.firebaseapp.com",
  projectId: "owasp-78ee6",
  storageBucket: "owasp-78ee6.firebasestorage.app",
  messagingSenderId: "142802259787",
  appId: "1:142802259787:web:1378f46932bc4cecdf62ce",
  measurementId: "G-WDBNXCDFZS"
};
```

### Firestore Database Structure

The application uses a `registrations` collection with the following document structure:

```javascript
{
  teamNumber: "string",
  teamName: "string", 
  teamLeader: "string",
  problemStatementId: "string",
  problemStatementTitle: "string",
  timestamp: "Firebase Timestamp"
}
```

## 📱 Application Routes

- **`/`** - Home page with team registration form
- **`/problems/:teamData`** - Problem statement selection page
- **`/admin`** - Admin dashboard for viewing registrations

## 🎯 Problem Statements

The application includes 6 pre-defined problem statements:

1. **Smart Traffic Management System** - AI-powered traffic optimization
2. **Sustainable Energy Monitor** - IoT-based energy consumption tracking
3. **Healthcare Data Analytics** - Patient data analysis for early detection
4. **Agricultural Automation** - Automated farming with drones and sensors
5. **Financial Fraud Detection** - ML-based fraud detection system
6. **Educational Learning Assistant** - AI-powered adaptive learning platform

## 🔧 Key Components

### 1. RegistrationForm.jsx
- Handles team registration with validation
- Form fields: Team Number, Team Name, Team Leader Name
- Client-side validation for required fields
- Redirects to problem selection after successful submission

### 2. ProblemStatements.jsx
- Displays problem statements in responsive card layout
- Real-time tracking of team registrations per problem
- Automatic disabling of cards when 3-team limit is reached
- Firebase integration for storing team selections

### 3. AdminDashboard.jsx
- Admin interface for viewing all registrations
- Sortable table with registration details
- PDF export functionality
- Real-time data refresh capability

## 🎨 UI/UX Features

- **Modern Card Design**: Clean, professional card layout for problem statements
- **Bootstrap Integration**: Responsive grid system and components
- **Interactive Elements**: Hover effects and smooth transitions
- **Loading States**: Spinners and loading indicators
- **Error Handling**: User-friendly error messages
- **Success Feedback**: Clear confirmation messages

## 📊 Admin Features

### Registration Table
- Serial Number
- Team Number  
- Team Name
- Team Leader Name
- Selected Problem Statement
- Registration Date

### PDF Export
- Clean table format
- Automatic date generation
- Professional styling
- Download functionality

## 🚀 Usage Instructions

### For Teams:
1. Open the application at `http://localhost:3000`
2. Fill in team registration form (Team Number, Team Name, Team Leader)
3. Browse available problem statements in card layout
4. Click "Select" on desired problem statement
5. Receive confirmation message and automatic redirect

### For Admins:
1. Navigate to `http://localhost:3000/admin`
2. View all team registrations in table format
3. Use "Refresh" button to get latest data
4. Click "Download PDF" to export registration data

## 🛡️ Validation Rules

- All form fields are required
- Real-time validation feedback
- Client-side and server-side validation
- Each problem statement limited to 3 teams
- Automatic UI updates when limits are reached

## 📱 Responsive Design

- Mobile-first approach using Bootstrap
- Responsive card grid (1 column on mobile, 2-3 on desktop)
- Touch-friendly interface elements
- Adaptive navigation and layout

## 🔧 Development

### Available Scripts

- `npm start` - Start development server (http://localhost:3000)
- `npm build` - Create production build
- `npm test` - Run test suite
- `npm eject` - Eject from Create React App

### File Structure

```
src/
├── components/
│   ├── RegistrationForm.jsx    # Team registration form
│   ├── ProblemStatements.jsx   # Problem statement cards
│   └── AdminDashboard.jsx      # Admin dashboard with PDF export
├── firebase.js                 # Firebase configuration and exports
├── App.js                      # Main app with routing
├── index.js                    # Entry point with Bootstrap import
└── index.css                   # Global styles
```

## 🐛 Troubleshooting

### Common Issues:

1. **Firebase Connection Error**
   - Verify Firestore is enabled in Firebase Console
   - Check network connectivity
   - Ensure Firebase project permissions

2. **Build Errors**
   - Clear node_modules: `rm -rf node_modules && npm install`
   - Check for dependency conflicts
   - Verify React and Firebase versions

3. **PDF Export Issues**
   - Ensure jsPDF is properly installed
   - Check browser compatibility
   - Verify table data format

## ✅ Testing the Application

1. **Registration Flow**:
   - Fill out team form → Submit → View problem cards → Select problem → Success message

2. **Admin Dashboard**:
   - Navigate to /admin → View registrations → Download PDF → Refresh data

3. **Limit Testing**:
   - Register 3 teams for same problem → Verify card becomes disabled

## 🎯 Current Status

✅ **Completed Features**:
- React app with Bootstrap styling
- Firebase Firestore integration
- Team registration form with validation
- Problem statement card layout
- 3-team limit per problem statement
- Admin dashboard with table view
- PDF export functionality
- Responsive design
- Real-time data updates
- Success/error messaging

## 📄 License

This project is open source and available under the MIT License.

---

**🎉 Your Problem Statement Registration Website is ready to use!**

**Access URLs**:
- **Main App**: http://localhost:3000
- **Admin Dashboard**: http://localhost:3000/admin

The application is fully functional with Firebase backend integration!

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
#   o w a s p  
 #   p r o b l e m s t a t m e n t  
 #   p r o b l e m s t a t m e n t  
 #   p r o b l e m s t a t m e n t  
 