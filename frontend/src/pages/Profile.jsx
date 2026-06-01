import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, School, BookOpen, Camera, CheckCircle, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { authApi } from '../services/api';

const Profile = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPic, setUploadingPic] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  // Profile data state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone_number: '',
    college_name: '',
    specialization: '',
    profile_picture: ''
  });

  const fileInputRef = useRef(null);
  const token = localStorage.getItem('token');

  // Fetch current user details on load
  const fetchProfile = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      if (!token) {
        setErrorMsg('You must be logged in to view your profile.');
        setLoading(false);
        return;
      }
      const data = await authApi.getMe(token);
      setFormData({
        name: data.name || '',
        email: data.email || '',
        phone_number: data.phone_number || '',
        college_name: data.college_name || '',
        specialization: data.specialization || '',
        profile_picture: data.profile_picture || ''
      });
    } catch (err) {
      console.error('Error fetching profile:', err);
      setErrorMsg(err.message || 'Failed to load user profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    if (!formData.name.trim()) {
      setErrorMsg('Full Name is required.');
      setSaving(false);
      return;
    }
    if (!formData.email.trim()) {
      setErrorMsg('Email address is required.');
      setSaving(false);
      return;
    }

    try {
      const updated = await authApi.updateProfile({
        name: formData.name,
        email: formData.email,
        phone_number: formData.phone_number || null,
        college_name: formData.college_name || null,
        specialization: formData.specialization || null
      }, token);

      setSuccessMsg('Profile updated successfully!');
      // Update global states
      localStorage.setItem('user_name', updated.name);
      // Trigger update event if layout listens
      window.dispatchEvent(new Event('storage'));
      
      setFormData(prev => ({
        ...prev,
        name: updated.name,
        email: updated.email,
        phone_number: updated.phone_number || '',
        college_name: updated.college_name || '',
        specialization: updated.specialization || ''
      }));

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Error saving profile:', err);
      setErrorMsg(err.message || 'Failed to update profile details.');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Client side checks
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select an image file (PNG, JPG, or WEBP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Image size must be less than 5MB.');
      return;
    }

    setUploadingPic(true);
    setErrorMsg('');
    setSuccessMsg('');

    const uploadData = new FormData();
    uploadData.append('file', file);

    try {
      const data = await authApi.uploadProfilePicture(uploadData, token);
      setFormData(prev => ({
        ...prev,
        profile_picture: data.profile_picture
      }));
      setSuccessMsg('Profile picture updated!');
      // Trigger header bar refresh
      window.dispatchEvent(new Event('storage'));
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Error uploading avatar:', err);
      setErrorMsg(err.message || 'Failed to upload profile picture.');
    } finally {
      setUploadingPic(false);
    }
  };

  const handleRemovePicture = async () => {
    if (!window.confirm('Are you sure you want to remove your profile picture?')) return;
    setUploadingPic(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await authApi.deleteProfilePicture(token);
      setFormData(prev => ({
        ...prev,
        profile_picture: ''
      }));
      setSuccessMsg('Profile picture removed successfully.');
      // Trigger header bar refresh
      window.dispatchEvent(new Event('storage'));
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Error removing avatar:', err);
      setErrorMsg(err.message || 'Failed to remove profile picture.');
    } finally {
      setUploadingPic(false);
    }
  };

  // Helper to resolve profile picture url
  const getProfilePictureUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const backendBaseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
      ? 'http://localhost:8000' 
      : 'https://ai-interview-preparation-platform-p5g3.onrender.com';
    return `${backendBaseUrl}${path}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-6rem)]">
        <div className="text-primary animate-pulse flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <span>Loading your profile details...</span>
        </div>
      </div>
    );
  }

  const avatarUrl = getProfilePictureUrl(formData.profile_picture);

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary border border-primary/20">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">My Profile</h1>
            <p className="text-slate-400 text-sm">Update and manage your personal & academic credentials</p>
          </div>
        </div>
      </div>

      {successMsg && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-3 text-sm"
        >
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </motion.div>
      )}

      {errorMsg && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-3 text-sm"
        >
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </motion.div>
      )}

      {/* Main Responsive Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side Panel: Information Form */}
        <div className="lg:col-span-8 glass-card p-6 space-y-6 order-2 lg:order-1">
          <div className="flex items-center gap-2 pb-2 border-b border-white/5">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-white">Personal Information</h2>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Full Name */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Full Name</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Rohith Goud"
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all text-sm"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Email Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    required
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="email@example.com"
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all text-sm"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Phone Number</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                    <Phone className="w-4 h-4" />
                  </span>
                  <input
                    type="tel"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleChange}
                    placeholder="+91 98765 43210"
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all text-sm"
                  />
                </div>
              </div>

              {/* College Name */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">College / University</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                    <School className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    name="college_name"
                    value={formData.college_name}
                    onChange={handleChange}
                    placeholder="IIT Bombay"
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all text-sm"
                  />
                </div>
              </div>

              {/* Specialization */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Specialization / Domain</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                    <BookOpen className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    name="specialization"
                    value={formData.specialization}
                    onChange={handleChange}
                    placeholder="Computer Science & Engineering / Full Stack Web Development"
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all text-sm"
                  />
                </div>
              </div>

            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-semibold hover:shadow-[0_0_15px_rgba(147,51,234,0.3)] transition-all flex items-center gap-2 active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving Changes...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Side Panel: Profile Picture container positioned at the top-right in standard layouts */}
        <div className="lg:col-span-4 glass-card p-6 flex flex-col items-center justify-center text-center space-y-6 order-1 lg:order-2">
          <div className="w-full flex items-center justify-between pb-2 border-b border-white/5">
            <h3 className="text-sm font-semibold text-slate-300">Profile Picture</h3>
          </div>

          <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
            {/* Round Avatar Container */}
            <div className="w-44 h-44 rounded-full overflow-hidden border-4 border-slate-800 bg-slate-950 flex items-center justify-center shadow-2xl relative transition-all duration-300 group-hover:border-primary/60 aspect-square shrink-0">
              
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt="Profile" 
                  className="w-full h-full object-cover object-center rounded-full shrink-0 select-none block"
                />
              ) : (
                <User className="w-20 h-20 text-slate-600" />
              )}

              {/* Upload Hover Overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-2 duration-300 rounded-full">
                <Camera className="w-8 h-8 text-primary" />
                <span className="text-[10px] font-semibold uppercase tracking-wider">Upload New</span>
              </div>
            </div>

            {/* Spinner Overlay during active upload */}
            {uploadingPic && (
              <div className="absolute inset-0 bg-black/70 rounded-full flex flex-col items-center justify-center text-white gap-2 z-10">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <span className="text-[10px] font-medium tracking-wide">Uploading...</span>
              </div>
            )}
          </div>

          <div className="space-y-3 w-full">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".jpg,.jpeg,.png,.webp,.gif"
              onChange={handleFileChange}
            />
            <div className="flex flex-col gap-2 w-full max-w-[200px] mx-auto">
              <button
                onClick={handleAvatarClick}
                disabled={uploadingPic}
                className="w-full px-4 py-2.5 border border-white/10 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                Update Image
              </button>
              
              {formData.profile_picture && (
                <button
                  onClick={handleRemovePicture}
                  disabled={uploadingPic}
                  className="w-full px-4 py-2.5 border border-red-500/20 rounded-xl text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  Remove Picture
                </button>
              )}
            </div>
            <p className="text-[10px] text-slate-500 leading-normal max-w-[200px] mx-auto">
              JPG, PNG or WEBP formats. Max file size limit is 5MB.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Profile;
