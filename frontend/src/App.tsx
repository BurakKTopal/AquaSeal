import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import UploadPage from './pages/UploadPage'
import VerifyPage from './pages/VerifyPage'
import DeveloperPage from './pages/DeveloperPage'
import Navbar from './components/layout/Navbar'
import Providers from './components/providers/Providers'
import './styles/globals.css'

function App() {
  return (
    <Providers>
      <Router>
        <div className="app">
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<UploadPage />} />
              <Route path="/verify" element={<VerifyPage />} />
              <Route path="/developer" element={<DeveloperPage />} />
            </Routes>
          </main>
        </div>
      </Router>
    </Providers>
  )
}

export default App

