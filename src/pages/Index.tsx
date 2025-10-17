import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ServiceCard from '@/components/ServiceCard';
import LocationMap from '@/components/LocationMap';
import BookingStatus from '@/components/BookingStatus';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { findNearestMechanic, calculateETA } from '@/utils/distance';
import { Wrench, Droplet, Disc, Battery, Sparkles, LogOut } from 'lucide-react';

const services = [
  { id: 'general', title: 'General Repair', icon: Wrench },
  { id: 'oil', title: 'Oil Change', icon: Droplet },
  { id: 'tire', title: 'Tire Replacement', icon: Disc },
  { id: 'battery', title: 'Battery Check', icon: Battery },
  { id: 'cleaning', title: 'Cleaning', icon: Sparkles },
];

const Index = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { profile, role, loading: profileLoading } = useUserProfile(user?.id);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [currentBooking, setCurrentBooking] = useState<any>(null);
  const [assignedMechanic, setAssignedMechanic] = useState<any>(null);
  const [isBooking, setIsBooking] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocation({ lat: latitude, lon: longitude });
        },
        (error) => {
          console.error('Error getting location:', error);
          toast({
            title: 'Location Error',
            description: 'Unable to get your location. Using default.',
            variant: 'destructive'
          });
          setLocation({ lat: 40.7128, lon: -74.0060 });
        }
      );
    }
  }, [toast]);

  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel('bookings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `customer_id=eq.${profile.id}`
        },
        async (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            setCurrentBooking(payload.new);
            
            if (payload.new.mechanic_id) {
              const { data: mechanic } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', payload.new.mechanic_id)
                .single();
              
              setAssignedMechanic(mechanic);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  const handleBookMechanic = async () => {
    if (!selectedService || !location || !profile) {
      toast({
        title: 'Missing Information',
        description: 'Please select a service and ensure location is available',
        variant: 'destructive'
      });
      return;
    }

    setIsBooking(true);

    try {
      const { data: mechanics } = await supabase
        .from('profiles')
        .select('*, user_roles!inner(role)')
        .eq('user_roles.role', 'mechanic')
        .eq('is_available', true);

      const nearestMechanic = findNearestMechanic(
        location.lat,
        location.lon,
        mechanics || []
      );

      if (!nearestMechanic) {
        toast({
          title: 'No Mechanics Available',
          description: 'No mechanics are available at the moment',
          variant: 'destructive'
        });
        setIsBooking(false);
        return;
      }

      const distance = nearestMechanic.distance;
      const eta = calculateETA(distance);

      const { data: booking, error } = await supabase
        .from('bookings')
        .insert({
          customer_id: profile.id,
          mechanic_id: nearestMechanic.id,
          service_type: services.find(s => s.id === selectedService)?.title || selectedService,
          customer_lat: location.lat,
          customer_lon: location.lon,
          distance,
          eta,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentBooking(booking);
      setAssignedMechanic(nearestMechanic);

      toast({
        title: 'Booking Created',
        description: 'Your mechanic has been notified'
      });
    } catch (error) {
      console.error('Booking error:', error);
      toast({
        title: 'Booking Failed',
        description: 'Unable to create booking. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsBooking(false);
    }
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

  if (role === 'mechanic') {
    navigate('/mechanic');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/10 to-background p-4">
      <div className="max-w-4xl mx-auto space-y-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Wrench className="h-8 w-8 text-primary" />
              Doorstep Mechanic
            </h1>
            <p className="text-muted-foreground">Book your nearest mechanic instantly</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>

        {location && <LocationMap lat={location.lat} lon={location.lon} />}

        {!currentBooking ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Select a Service</CardTitle>
                <CardDescription>Choose the service you need</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {services.map((service) => (
                    <ServiceCard
                      key={service.id}
                      icon={service.icon}
                      title={service.title}
                      selected={selectedService === service.id}
                      onClick={() => setSelectedService(service.id)}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={handleBookMechanic}
              disabled={!selectedService || !location || isBooking}
              className="w-full"
              size="lg"
            >
              {isBooking ? 'Finding Mechanic...' : 'Book Mechanic'}
            </Button>
          </>
        ) : (
          <BookingStatus booking={currentBooking} mechanic={assignedMechanic} />
        )}
      </div>
    </div>
  );
};

export default Index;
