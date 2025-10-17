import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Wrench, LogOut, MapPin, Clock } from 'lucide-react';

const Mechanic = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { profile, role, loading: profileLoading, updateAvailability, updateLocation } = useUserProfile(user?.id);
  const [bookings, setBookings] = useState<any[]>([]);
  const [isAvailable, setIsAvailable] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (profile) {
      setIsAvailable(profile.is_available);
    }
  }, [profile]);

  useEffect(() => {
    if (!profile?.id) return;

    const fetchBookings = async () => {
      const { data } = await supabase
        .from('bookings')
        .select('*, customer:customer_id(name, email)')
        .eq('mechanic_id', profile.id)
        .order('created_at', { ascending: false });

      if (data) setBookings(data);
    };

    fetchBookings();

    const channel = supabase
      .channel('mechanic-bookings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `mechanic_id=eq.${profile.id}`
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const { data: customer } = await supabase
              .from('profiles')
              .select('name, email')
              .eq('id', payload.new.customer_id)
              .single();

            setBookings(prev => [{ ...payload.new, customer }, ...prev]);

            toast({
              title: 'New Booking Request',
              description: `New ${payload.new.service_type} request received`
            });
          } else if (payload.eventType === 'UPDATE') {
            setBookings(prev =>
              prev.map(b => (b.id === payload.new.id ? { ...b, ...payload.new } : b))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, toast]);

  useEffect(() => {
    if (navigator.geolocation && profile) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          updateLocation(latitude, longitude);
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  }, [profile, updateLocation]);

  const handleAvailabilityToggle = async (checked: boolean) => {
    setIsAvailable(checked);
    await updateAvailability(checked);
    toast({
      title: checked ? 'Now Available' : 'Now Unavailable',
      description: checked ? 'You can now receive booking requests' : 'You will not receive new requests'
    });
  };

  const handleAcceptBooking = async (bookingId: string) => {
    await supabase
      .from('bookings')
      .update({ status: 'accepted' })
      .eq('id', bookingId);

    toast({
      title: 'Booking Accepted',
      description: 'Customer has been notified'
    });
  };

  const handleRejectBooking = async (bookingId: string) => {
    await supabase
      .from('bookings')
      .update({ status: 'rejected' })
      .eq('id', bookingId);

    toast({
      title: 'Booking Rejected',
      description: 'Customer has been notified'
    });
  };

  const handleCompleteBooking = async (bookingId: string) => {
    await supabase
      .from('bookings')
      .update({ status: 'completed' })
      .eq('id', bookingId);

    toast({
      title: 'Job Completed',
      description: 'Great work!'
    });
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  if (authLoading || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (role !== 'mechanic') {
    navigate('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/10 to-background p-4">
      <div className="max-w-4xl mx-auto space-y-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Wrench className="h-8 w-8 text-primary" />
              Mechanic Dashboard
            </h1>
            <p className="text-muted-foreground">Manage your bookings</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Availability Status</CardTitle>
            <CardDescription>Toggle your availability to receive booking requests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Switch
                id="availability"
                checked={isAvailable}
                onCheckedChange={handleAvailabilityToggle}
              />
              <Label htmlFor="availability">
                {isAvailable ? 'Available for bookings' : 'Not accepting bookings'}
              </Label>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Booking Requests</h2>
          {bookings.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No bookings yet
              </CardContent>
            </Card>
          ) : (
            bookings.map((booking) => (
              <Card key={booking.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{booking.service_type}</CardTitle>
                    <Badge
                      className={
                        booking.status === 'pending'
                          ? 'bg-yellow-500'
                          : booking.status === 'accepted'
                          ? 'bg-blue-500'
                          : booking.status === 'completed'
                          ? 'bg-green-500'
                          : 'bg-red-500'
                      }
                    >
                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </Badge>
                  </div>
                  <CardDescription>
                    Customer: {booking.customer?.name || 'Unknown'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>
                      Distance: {booking.distance ? `${booking.distance.toFixed(2)} km` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>ETA: {booking.eta ? `${booking.eta} minutes` : 'N/A'}</span>
                  </div>

                  {booking.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleAcceptBooking(booking.id)}
                        className="flex-1"
                      >
                        Accept
                      </Button>
                      <Button
                        onClick={() => handleRejectBooking(booking.id)}
                        variant="destructive"
                        className="flex-1"
                      >
                        Reject
                      </Button>
                    </div>
                  )}

                  {booking.status === 'accepted' && (
                    <Button
                      onClick={() => handleCompleteBooking(booking.id)}
                      className="w-full"
                    >
                      Mark as Completed
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Mechanic;
