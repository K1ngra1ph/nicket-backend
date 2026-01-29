import axios from "axios";

export default async function sendWinnerEmail(email, name, numbers, event) {
  try {
    const response = await axios.post(
      "https://nicketonemail.zeabur.app/api/send-winner",
      { email, name, numbers, event },
      { 
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'x-nicket-key': 'savage2000savage2000'
        }
      }
    );
    return response.data.success;
  } catch (err) {
    console.error("[sendWinnerEmail] Error:", err.response?.data || err.message);
    return false;
  }
}
