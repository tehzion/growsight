# Growsight

A comprehensive feedback platform built with React, TypeScript, and Tailwind CSS. This application enables organizations to conduct structured feedback assessments with multiple question types, progress tracking, and detailed reporting.

## 🚀 Features

### Core Functionality
- **Multi-Organization Support** - Manage multiple organizations with role-based access
- **User Management** - Create and manage users with different roles (Super Admin, Employee, Reviewer)
- **Assessment Builder** - Create custom assessments with sections and various question types
- **Question Types** - Support for rating scales, multiple choice, yes/no, and text responses
- **Progress Tracking** - Real-time progress monitoring for assessment completion
- **Results & Analytics** - Comprehensive reporting with side-by-side comparisons

### User Roles
- **Super Admin** - Full system access, organization management
- **Employee** - Complete self-assessments, view personal results
- **Reviewer** - Complete assessments for assigned employees

### Assessment Features
- **Section-Based Structure** - Organize questions into logical sections
- **Multiple Question Types** - Rating scales (1-10), multiple choice, yes/no, text responses
- **Custom Rating Scales** - Configurable scale maximums (2-10)
- **Required/Optional Questions** - Flexible question requirements
- **Progress Tracking** - Section and overall completion tracking
- **Draft & Published States** - Control assessment availability

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **State Management**: Zustand
- **Routing**: React Router v6
- **Forms**: React Hook Form with Zod validation
- **Icons**: Lucide React
- **Charts**: Recharts
- **Database**: Supabase (PostgreSQL)
- **Build Tool**: Vite

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd growsight
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Database Setup**
   - Create a new Supabase project
   - Run the migration files in `/supabase/migrations/` in order
   - Enable Row Level Security (RLS) policies

5. **Start Development Server**
   ```bash
   npm run dev
   ```

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Deploy to Netlify
1. Connect your repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variables in Netlify dashboard

### Deploy to Vercel
1. Connect your repository to Vercel
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Add environment variables in Vercel dashboard

## 🎯 Demo Mode

The application includes a demo mode that works without Supabase configuration:

- **Default User**: Super Admin with demo organization access
- **Mock Data**: Pre-populated organizations, users, and assessments
- **Full Functionality**: All features work with in-memory data
- **Assessment Flow**: Complete assessment creation, publishing, and completion workflow

## 📱 Usage

### Getting Started
1. **Login** with demo credentials or create a new account
2. **Create Organization** (Super Admin only)
3. **Add Users** to your organization
4. **Build Assessments** with custom sections and questions
5. **Publish Assessments** to make them available to users
6. **Complete Assessments** as employee or reviewer
7. **View Results** with detailed analytics and comparisons

### Assessment Workflow
1. **Create** - Build assessment structure with sections
2. **Design** - Add questions with various types and configurations
3. **Publish** - Assign to organizations and make available
4. **Complete** - Users fill out their assigned assessments
5. **Analyze** - Review results with side-by-side comparisons

## 🔧 Configuration

### Question Types
- **Rating Scale**: 1-N scale (configurable maximum)
- **Multiple Choice**: Custom options with optional values
- **Yes/No**: Simple binary choice
- **Text Response**: Free-form text input

### User Roles & Permissions
- **Super Admin**: Full system access, organization management
- **Employee**: Self-assessment completion, personal results viewing
- **Reviewer**: Assessment completion for assigned employees

## 🎨 Design System

The application uses a comprehensive design system with:
- **Color Palette**: Primary, secondary, accent, success, warning, error
- **Typography**: Inter font family with consistent sizing
- **Spacing**: 8px grid system
- **Components**: Reusable UI components with consistent styling
- **Animations**: Smooth transitions and micro-interactions

## 🔒 Security

- **Row Level Security (RLS)**: Database-level access control
- **Role-Based Access**: Different permissions for each user role
- **Data Isolation**: Organizations can only access their own data
- **Input Validation**: Client and server-side validation
- **Secure Authentication**: Supabase Auth integration

## 📊 Performance

- **Code Splitting**: Automatic chunking for optimal loading
- **Lazy Loading**: Components loaded on demand
- **Optimized Builds**: Minified and compressed production builds
- **Caching**: Efficient state management and data caching

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Check the documentation
- Review existing issues
- Create a new issue with detailed information

---

Built with ❤️ using React, TypeScript, and Tailwind CSS