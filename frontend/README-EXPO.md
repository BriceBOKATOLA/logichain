Expo migration notes

1) Install and run

- Ensure Node 18+, npm/yarn, and Expo CLI installed:

```bash
npm install -g expo-cli
cd frontend
npm install
npm run start
```

2) Replacements for native modules

- `react-native-vision-camera` -> use `expo-camera` (frame processors unsupported)
- `react-native-sqlite-storage` -> use `expo-sqlite` or migrate to remote DB + sync
- `react-native-ml-kit` -> replace with cloud-based barcode or `expo-barcode-scanner`
- `react-native-maps` -> use `react-native-maps` with Expo config plugin or `expo-google-maps` workarounds
- `react-native-geolocation-service` -> use `expo-location`

3) Backend connection

- The app reads API base URL from `src/config/env.js` (create if missing) and uses Axios. Ensure backend is running and `MONGO_URI` set.

4) Admin credentials (from backend seed)

- Email: admin@logichain.io
- Password: Admin1234!

5) Next steps

- I'll migrate screens and components into the Expo project files and adapt imports.
- I can also implement login flow and a first-run admin creation call to your backend if you want.

6) Design

- I will preserve your styles where possible and adjust components (`PrimaryButton`, `AlertBanner`) to work with Expo.

7) Testing

- After migration, run `npm run android` to open in Expo Go.

If you approve, I will scaffold the Expo files, migrate top-level components, and implement backend connection + first-run admin creation.