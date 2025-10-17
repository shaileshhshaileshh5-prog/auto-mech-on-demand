import { MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface LocationMapProps {
  lat: number;
  lon: number;
}

const LocationMap = ({ lat, lon }: LocationMapProps) => {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center space-x-3">
          <MapPin className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <p className="text-sm font-medium">Your Location</p>
            <p className="text-xs text-muted-foreground">
              {lat.toFixed(4)}, {lon.toFixed(4)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LocationMap;
