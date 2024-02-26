import circle from '@turf/circle';
import booleanIntersects from '@turf/boolean-intersects';

export function parseLocationForm(form) {
    const latitude = parseFloat(form.get('latitude').value.toString());
    const longitude = parseFloat(form.get('longitude').value.toString());
    const accuracy = parseFloat(form.get('accuracy').value.toString());
    const timestamp = parseInt(form.get('timestamp').value.toString());
  
    const location = {
      latitude: isNaN(latitude) ? null : latitude,
      longitude: isNaN(longitude) ? null : longitude,
      accuracy: isNaN(accuracy) ? null : accuracy,
      timestamp: isNaN(timestamp) ? null : timestamp,
      source: 'browser'
    };

    return location;
}

export function isLocationInFeatureCollection(location, featureCollection) {
    const center = [location.longitude, location.latitude];
    const radius = location.accuracy;
    const options = { steps: 20, units: 'meters' };
    const locationCircle = circle(center, radius, options);
    var isInCollection = false;

    for (const feature of featureCollection.features) {
        if (booleanIntersects(feature, locationCircle)) {
            isInCollection = true;
        }
    }

    return isInCollection;
}