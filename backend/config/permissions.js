module.exports = {
  // إدارة المستخدمين
  'users.create':        ['superadmin', 'hr'],
  'users.edit':          ['superadmin', 'hr'],
  'users.delete':        ['superadmin'],
  'users.view.all':      ['superadmin', 'hr'],
  'users.view.branch':   ['superadmin', 'hr', 'manager'],
  'users.assign.roles':  ['superadmin'],
  
  // الفروع
  'branches.create':     ['superadmin'],
  'branches.edit':       ['superadmin'],
  'branches.delete':     ['superadmin'],
  'branches.view.all':   ['superadmin', 'hr', 'viewer'],
  'branches.view.own':   ['manager'],
  'branches.assign.manager': ['superadmin'],
  
  // الحضور
  'attendance.checkin':       ['superadmin', 'manager', 'hr', 'employee'],
  'attendance.view.own':      ['superadmin', 'manager', 'hr', 'employee'],
  'attendance.view.branch':   ['superadmin', 'manager', 'hr'],
  'attendance.view.all':      ['superadmin', 'hr', 'viewer'],
  'attendance.edit':          ['superadmin', 'hr'],
  'attendance.delete':        ['superadmin'],
  
  // الإجازات
  'leaves.request':           ['superadmin', 'manager', 'hr', 'employee'],
  'leaves.view.own':          ['superadmin', 'manager', 'hr', 'employee'],
  'leaves.approve.branch':    ['superadmin', 'manager'],
  'leaves.approve.all':       ['superadmin', 'hr'],
  
  // التقارير
  'reports.view.own':         ['superadmin', 'manager', 'hr', 'employee'],
  'reports.view.branch':      ['superadmin', 'manager', 'hr'],
  'reports.view.all':         ['superadmin', 'hr', 'viewer'],
  'reports.export':           ['superadmin', 'hr', 'manager'],
  
  // الإعدادات
  'settings.view':            ['superadmin'],
  'settings.edit':            ['superadmin'],
  'settings.branding':        ['superadmin'],
  
  // الإشعارات
  'notifications.view.own':   ['superadmin', 'manager', 'hr', 'employee', 'viewer'],
  'notifications.broadcast':  ['superadmin'],
};