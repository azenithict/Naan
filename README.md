# بانو | Bano Bakery

A responsive Persian (RTL) bakery ordering demo with Sangak, Barbari and Taftoon, quantity controls, pickup/delivery, validated checkout and browser-local order history.

## Run

No dependencies or build step. From this directory:

```sh
python3 -m http.server 3000 --bind 0.0.0.0
```

Open the served app in a browser. Prices are illustrative, in toman. Orders are saved only in this browser's localStorage; there is no backend, payment processing or transmission to a bakery. Customer details remain on the device and can be removed through browser site-data settings. The optional Google font falls back to local fonts if unavailable.
