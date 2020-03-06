# TODO

* Use user's timezone and time display in notification (need to add setting in db and frontend)
* Add locations to notifications. Options (all not great):
    * add GraphQL to notify server, then use db server's geocode endpoints
    * add REST Geocoding API to db server so the notify server does not need GraphQL
    * query Here API from both db and notify server
