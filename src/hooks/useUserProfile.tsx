import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useUserProfile = (userId: string | undefined) => {
  const [profile, setProfile] = useState<any>(null);
  const [role, setRole] = useState<'customer' | 'mechanic' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      setProfile(profileData);
      setRole(roleData?.role || null);
      setLoading(false);
    };

    fetchProfile();
  }, [userId]);

  const updateLocation = async (lat: number, lon: number) => {
    if (!profile) return;

    await supabase
      .from('profiles')
      .update({ lat, lon })
      .eq('id', profile.id);
  };

  const updateAvailability = async (isAvailable: boolean) => {
    if (!profile) return;

    await supabase
      .from('profiles')
      .update({ is_available: isAvailable })
      .eq('id', profile.id);
  };

  return { profile, role, loading, updateLocation, updateAvailability };
};
