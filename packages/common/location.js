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