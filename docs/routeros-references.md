# RouterOS integration references

## Sources

1. MikroTik, [API - RouterOS](https://help.mikrotik.com/docs/spaces/ROS/pages/47579160/API). The official documentation describes the RouterOS API sentence protocol, encoded words, the `/login` flow used from RouterOS v6.43 onward, default API ports 8728 and 8729, and commands such as `/system/resource/print`.

2. MikroTik, [REST API - RouterOS](https://help.mikrotik.com/docs/spaces/ROS/pages/47579162/REST+API). The official documentation states that the REST wrapper starts with RouterOS v7.1beta4, uses HTTP Basic Auth, and should use HTTPS; therefore the application targets the native API protocol for RouterOS v6.49.19 instead of assuming REST support.

3. MikroTik, [User Manager - RouterOS](https://help.mikrotik.com/docs/spaces/ROS/pages/2555940/User+Manager). The official documentation describes User Manager as a RouterOS RADIUS server and documents its resource area under `/user-manager`, which is reflected in the server resource allowlist.

## Project decision

For RouterOS v6.49.19, the app uses a server-side RouterOS API client. The mobile client sends connection data only over the app API when the user explicitly tests or operates a router. The app does not open a raw RouterOS socket from the phone. External access requires the server-side mediator to reach the router through a private network, VPN, or HTTPS-secured channel; the unencrypted API port must not be exposed to the public internet.
