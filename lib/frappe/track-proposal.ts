import axios from 'axios';
import { FRAPPE_BASE_URL } from "../../templates/tendencia-event-recommendation/plugins/frappe-http.ts";

export const trackProposalClick = async (dealId: string) => {
  try {
    // 1. Capture Client Timestamp (Formatted for ERPNext Datetime format: YYYY-MM-DD HH:mm:ss)
    const now = new Date();
    const timestamp = now.toISOString().replace('T', ' ').substring(0, 19);

    // 2. Capture Browser & Device Details
    const userAgent = navigator.userAgent;

    // 3. Prepare Payload
    const payload = {
      deal_id: dealId,
      timestamp: timestamp,
      user_agent: userAgent,
    };

    // 4. Send POST request to ERPNext
    const response = await axios.post(
      `${FRAPPE_BASE_URL}/api/method/record_proposal_click`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    console.log('Proposal click registered successfully:', response.data);

    return response.data;
  } catch (error) {
    console.error('Failed to register proposal click:', error);
  }
};