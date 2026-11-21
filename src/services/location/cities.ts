export type City = { id: string; name: string; state: string; lat: number; lng: number };

// Seeded Indian cities for the mock location provider.
const raw: [string, string, number, number][] = [
  ["Delhi", "Delhi", 28.6139, 77.209], ["Noida", "Uttar Pradesh", 28.5355, 77.391],
  ["Gurugram", "Haryana", 28.4595, 77.0266], ["Jaipur", "Rajasthan", 26.9124, 75.7873],
  ["Agra", "Uttar Pradesh", 27.1767, 78.0081], ["Chandigarh", "Chandigarh", 30.7333, 76.7794],
  ["Dehradun", "Uttarakhand", 30.3165, 78.0322], ["Haridwar", "Uttarakhand", 29.9457, 78.1642],
  ["Rishikesh", "Uttarakhand", 30.0869, 78.2676], ["Mathura", "Uttar Pradesh", 27.4924, 77.6737],
  ["Lucknow", "Uttar Pradesh", 26.8467, 80.9462], ["Varanasi", "Uttar Pradesh", 25.3176, 82.9739],
  ["Amritsar", "Punjab", 31.634, 74.8723], ["Shimla", "Himachal Pradesh", 31.1048, 77.1734],
  ["Manali", "Himachal Pradesh", 32.2396, 77.1887], ["Udaipur", "Rajasthan", 24.5854, 73.7125],
  ["Jodhpur", "Rajasthan", 26.2389, 73.0243], ["Ahmedabad", "Gujarat", 23.0225, 72.5714],
  ["Surat", "Gujarat", 21.1702, 72.8311], ["Vadodara", "Gujarat", 22.3072, 73.1812],
  ["Mumbai", "Maharashtra", 19.076, 72.8777], ["Pune", "Maharashtra", 18.5204, 73.8567],
  ["Nashik", "Maharashtra", 19.9975, 73.7898], ["Nagpur", "Maharashtra", 21.1458, 79.0882],
  ["Goa", "Goa", 15.2993, 74.124], ["Bangalore", "Karnataka", 12.9716, 77.5946],
  ["Mysore", "Karnataka", 12.2958, 76.6394], ["Mangalore", "Karnataka", 12.9141, 74.856],
  ["Coorg", "Karnataka", 12.4244, 75.7382], ["Hyderabad", "Telangana", 17.385, 78.4867],
  ["Vijayawada", "Andhra Pradesh", 16.5062, 80.648], ["Visakhapatnam", "Andhra Pradesh", 17.6868, 83.2185],
  ["Tirupati", "Andhra Pradesh", 13.6288, 79.4192], ["Chennai", "Tamil Nadu", 13.0827, 80.2707],
  ["Pondicherry", "Puducherry", 11.9416, 79.8083], ["Coimbatore", "Tamil Nadu", 11.0168, 76.9558],
  ["Madurai", "Tamil Nadu", 9.9252, 78.1198], ["Ooty", "Tamil Nadu", 11.4102, 76.695],
  ["Kochi", "Kerala", 9.9312, 76.2673], ["Thiruvananthapuram", "Kerala", 8.5241, 76.9366],
  ["Munnar", "Kerala", 10.0889, 77.0595], ["Kolkata", "West Bengal", 22.5726, 88.3639],
  ["Bhubaneswar", "Odisha", 20.2961, 85.8245], ["Patna", "Bihar", 25.5941, 85.1376],
  ["Bhopal", "Madhya Pradesh", 23.2599, 77.4126], ["Indore", "Madhya Pradesh", 22.7196, 75.8577],
  ["Raipur", "Chhattisgarh", 21.2514, 81.6296], ["Ranchi", "Jharkhand", 23.3441, 85.3096],
  ["Guwahati", "Assam", 26.1445, 91.7362],
];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

export const CITIES: City[] = raw.map(([name, state, lat, lng]) => ({ id: slug(name), name, state, lat, lng }));
export const CITY_BY_ID = new Map(CITIES.map((c) => [c.id, c]));
