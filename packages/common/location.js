import circle from '@turf/circle';
import booleanIntersects from '@turf/boolean-intersects';

export function parseLocationForm(form) {
    var location = { source: 'browser' };
    var isValid = true;
    for (var attribute of ['latitude', 'longitude', 'accuracy', 'timestamp']) {
        const formValue = form.get(attribute);
        if (formValue) {
            if (attribute === 'timestamp') {
                location[attribute] = parseInt(formValue.value.toString());
            } else {
                location[attribute] = parseFloat(formValue.value.toString());
            }

            if (isNaN(location[attribute])) {
                isValid = false;
            }
        } else {
            isValid = false;
        }
    }

    if (isValid) {
        return location;
    } else {
        return null;
    }
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