export interface AdminActor {
  id?: string;
  email: string;
  role: string;
  ip?: string;
}

export function extractAdminActor(req: any): AdminActor {
  return {
    id: req?.user?.userId,
    email: req?.adminActor || req?.user?.email || 'super_admin',
    role: req?.user?.role || 'super_admin',
    ip: req?.ip,
  };
}

