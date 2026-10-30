import React from 'react';
import { 
  FaHome, FaUsers, FaMoneyBillWave, FaCog, FaBell, 
  FaSearch, FaUserCircle, FaBuilding, FaBriefcase 
} from 'react-icons/fa';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// بيانات وهمية للرسم البياني المالي
const financialData = [
  { name: 'يناير', value: 4000 },
  { name: 'فبراير', value: 3000 },
  { name: 'مارس', value: 5000 },
  { name: 'أبريل', value: 4500 },
  { name: 'مايو', value: 6000 },
  { name: 'يونيو', value: 5500 },
];

// بيانات وهمية للموظفين
const employees = [
  { id: 1, name: 'أحمد محمد', role: 'مدير مبيعات', avatar: 'https://i.pravatar.cc/150?img=11' },
  { id: 2, name: 'سارة علي', role: 'مطور واجهات', avatar: 'https://i.pravatar.cc/150?img=5' },
  { id: 3, name: 'خالد يوسف', role: 'محاسب', avatar: 'https://i.pravatar.cc/150?img=12' },
  { id: 4, name: 'نورة عبدالله', role: 'أخصائي موارد بشرية', avatar: 'https://i.pravatar.cc/150?img=9' },
];

export default function App() {
  return (
    <div className="flex h-screen bg-[#f8fafc] font-arabic text-gray-800 overflow-hidden">
      
      {/* القائمة الجانبية (Sidebar) - على اليمين لأن الاتجاه RTL */}
      <aside className="w-64 bg-white shadow-sm flex flex-col justify-between hidden md:flex border-l border-gray-100">
        <div>
          {/* الشعار */}
          <div className="h-20 flex items-center justify-center border-b border-gray-100">
            <div className="flex items-center gap-2 text-2xl font-bold text-brand-blue">
              <FaBuilding className="text-brand-cyan" />
              <span>نظام HR</span>
            </div>
          </div>
          
          {/* روابط التنقل */}
          <nav className="p-4 space-y-2">
            <a href="#" className="flex items-center gap-3 px-4 py-3 bg-blue-50 text-brand-blue rounded-xl font-bold transition">
              <FaHome size={20} />
              <span>الرئيسية</span>
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:bg-gray-50 hover:text-brand-blue rounded-xl transition font-medium">
              <FaUsers size={20} />
              <span>الموظفون</span>
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:bg-gray-50 hover:text-brand-blue rounded-xl transition font-medium">
              <FaBriefcase size={20} />
              <span>الشركات</span> {/* التاب المطلوب لإضافة الشركات */}
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:bg-gray-50 hover:text-brand-blue rounded-xl transition font-medium">
              <FaMoneyBillWave size={20} />
              <span>الرواتب</span>
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:bg-gray-50 hover:text-brand-blue rounded-xl transition font-medium">
              <FaCog size={20} />
              <span>الإعدادات</span>
            </a>
          </nav>
        </div>
      </aside>

      {/* المحتوى الرئيسي */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        
        {/* الشريط العلوي (Header) */}
        <header className="h-20 bg-white/80 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between px-6 border-b border-gray-100">
          {/* البحث */}
          <div className="relative w-96 hidden md:block">
            <input 
              type="text" 
              placeholder="ابحث عن موظف، قسم، أو شركة..." 
              className="w-full bg-gray-50 text-gray-700 rounded-full py-2.5 pr-12 pl-4 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 transition"
            />
            <FaSearch className="absolute right-4 top-3.5 text-gray-400" />
          </div>

          {/* الملف الشخصي والإشعارات */}
          <div className="flex items-center gap-6">
            <button className="relative p-2 text-gray-500 hover:text-brand-blue transition">
              <FaBell size={22} />
              <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="flex items-center gap-3 border-r pr-6 border-gray-200">
              <div className="text-left hidden sm:block">
                <p className="text-sm font-bold text-gray-800">محمد عبدالله</p>
                <p className="text-xs text-gray-500">مدير النظام</p>
              </div>
              <FaUserCircle size={40} className="text-gray-300" />
            </div>
          </div>
        </header>

        {/* محتوى الصفحة */}
        <div className="p-6 space-y-6">
          
          {/* الترحيب */}
          <div>
            <h1 className="text-2xl font-extrabold text-gray-800">الرئيسية</h1>
            <p className="text-gray-500 text-sm mt-1">نظرة عامة على شركة التقنية - الأحد 5 يناير 2026</p>
          </div>

          {/* المؤشرات العلوية (Metrics) */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { title: 'إجمالي الموظفين', value: '45', icon: <FaUsers />, color: 'text-blue-500', bg: 'bg-blue-50' },
              { title: 'على رأس العمل', value: '16', icon: <FaBriefcase />, color: 'text-green-500', bg: 'bg-green-50' },
              { title: 'الأقسام', value: '12', icon: <FaBuilding />, color: 'text-orange-500', bg: 'bg-orange-50' },
              { title: 'في إجازة اليوم', value: '29', icon: <FaUserCircle />, color: 'text-cyan-500', bg: 'bg-cyan-50' },
            ].map((item, idx) => (
              <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium mb-1">{item.title}</p>
                  <h3 className="text-3xl font-extrabold text-gray-800">{item.value}</h3>
                </div>
                <div className={`p-4 rounded-xl ${item.bg} ${item.color} text-2xl`}>
                  {item.icon}
                </div>
              </div>
            ))}
          </div>

          {/* الصفوف الوسطى */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* الرسم البياني الدائري (نسبة الموظفين) */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
              <h3 className="text-lg font-bold text-gray-800 self-start mb-4">حالة الموظفين</h3>
              <div className="relative w-48 h-48 flex items-center justify-center">
                {/* دائرة SVG */}
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="12" fill="none" />
                  <circle cx="50" cy="50" r="40" stroke="#1e3a8a" strokeWidth="12" fill="none" strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * 89) / 100} strokeLinecap="round" />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-4xl font-extrabold text-gray-800">89%</span>
                  <span className="text-xs text-gray-500 mt-1">نسبة رأس المال البشري</span>
                </div>
              </div>
              <div className="flex justify-between w-full mt-6 text-sm">
                <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-brand-blue"></span> 16 على رأس العمل</span>
                <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-orange-500"></span> 12 في إجازة</span>
              </div>
            </div>

            {/* قائمة الموظفين الجدد */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-800">أحدث الموظفين</h3>
                <button className="text-sm font-bold text-brand-blue hover:underline">عرض الكل</button>
              </div>
              <div className="space-y-4">
                {employees.map((emp) => (
                  <div key={emp.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition border border-transparent hover:border-gray-100">
                    <div className="flex items-center gap-4">
                      <img src={emp.avatar} alt={emp.name} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />
                      <div>
                        <p className="font-bold text-gray-800 text-sm">{emp.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{emp.role}</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full">نشط</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* الرسم البياني المالي (التحليلات) */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-800">التحليلات المالية (الرواتب)</h3>
              <select className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-brand-blue focus:border-brand-blue block p-2">
                <option>آخر 6 أشهر</option>
                <option>السنة الحالية</option>
              </select>
            </div>
            <div className="h-72 w-full" dir="ltr">
              {/* Recharts تدعم RTL بشكل تلقائي إذا تم ضبطها، لكننا نتركها LTR للرسم البياني لسهولة القراءة */}
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={financialData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#1e3a8a', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#1e3a8a" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}