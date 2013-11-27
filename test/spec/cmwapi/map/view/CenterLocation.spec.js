define(["cmwapi/Channels", "cmwapi/map/view/CenterLocation", "cmwapi/map/Error", "cmwapi/Validator",
    "test/mock/OWF", "test/mock/Ozone"], 
    function(Channels, CenterLocation, Error, Validator, OWF, Ozone) {

    describe(Channels.MAP_VIEW_CENTER_LOCATION + " module", function() {

        var INSTANCE_ID = OWF.getInstanceId();

        beforeEach(function() {
            
            // Mock the necessary OWF methods and attach them to the window.
            // OWF should be in global scope when other libraries attempt to
            // access it.
            window.OWF = OWF;
            window.Ozone = Ozone;
        });

        afterEach(function() {
            // Remove our mock objects from the window so neither they nor
            // any spies upon them hang around for other test suites.
            delete window.OWF;
            delete window.Ozone;
        });

        it("sends data to the correct channel", function() {
            var eventing = OWF.Eventing;
            expect(eventing).not.toBe(null);

            spyOn(CenterLocation, 'send').andCallThrough();
            spyOn(eventing, 'publish');
            spyOn(Error, 'send');

            CenterLocation.send({location: {lat: 1, lon: 2}});
            expect(CenterLocation.send).toHaveBeenCalled();

            // expect publish to be called
            expect(eventing.publish).toHaveBeenCalled();
            expect(eventing.publish.mostRecentCall.args[0]).toEqual(Channels.MAP_VIEW_CENTER_LOCATION);

            var payload = Ozone.util.parseJson(eventing.publish.mostRecentCall.args[1]);
            expect(payload.location.lat).toEqual(1);
            expect(payload.location.lon).toEqual(2);
            expect(payload.zoom).toBeUndefined();

            // don't expect error to be called
            expect(Error.send.calls.length).toEqual(0);
        });

        it("fails data with invalid zoom values", function() {
            var eventing = OWF.Eventing;
            expect(eventing).not.toBe(null);

            spyOn(CenterLocation, 'send').andCallThrough();
            spyOn(eventing, 'publish');
            spyOn(Error, 'send').andCallThrough();

            CenterLocation.send({location: {lat: 1, lon: 2}, zoom:{}});
            expect(CenterLocation.send).toHaveBeenCalled();

            // expect publish to be called on the error channel.
            expect(eventing.publish).toHaveBeenCalled();
            expect(eventing.publish.mostRecentCall.args[0]).toEqual(Channels.MAP_ERROR);

            CenterLocation.send({zoom:"test"});
            expect(CenterLocation.send).toHaveBeenCalled();

            // expect publish to be called on the error channel.
            expect(eventing.publish).toHaveBeenCalled();
            expect(eventing.publish.mostRecentCall.args[0]).toEqual(Channels.MAP_ERROR);

            expect(Error.send.calls.length).toEqual(2);
        });

        it("fails data with missing location values", function() {
            var eventing = OWF.Eventing;
            expect(eventing).not.toBe(null);

            spyOn(CenterLocation, 'send').andCallThrough();
            spyOn(eventing, 'publish');
            spyOn(Error, 'send').andCallThrough();

            CenterLocation.send({});
            expect(CenterLocation.send).toHaveBeenCalled();

            // expect publish to be called on the error channel.
            expect(eventing.publish).toHaveBeenCalled();
            expect(eventing.publish.mostRecentCall.args[0]).toEqual(Channels.MAP_ERROR);
            expect(Error.send.calls.length).toEqual(1);
        });

        it("unsubscribes the correct channel when removeHandlers is called", function() {

            var eventing = OWF.Eventing;

            spyOn(CenterLocation, 'removeHandlers').andCallThrough();
            spyOn(Error, 'send');
            spyOn(eventing, 'unsubscribe');

            CenterLocation.removeHandlers();
            expect(CenterLocation.removeHandlers).toHaveBeenCalled();
            expect(eventing.unsubscribe.mostRecentCall.args[0]).toEqual(Channels.MAP_VIEW_CENTER_LOCATION);

            expect(Error.send.calls.length).toEqual(0);

        });

        it("wraps added handlers and validates a zoom range", function() {

            var eventing = OWF.Eventing;
            spyOn(eventing, 'subscribe');

            var testHandler = jasmine.createSpy('testHandler');
            var newHandler = CenterLocation.addHandler(testHandler);
            expect(eventing.subscribe.mostRecentCall.args[0]).toEqual(Channels.MAP_VIEW_CENTER_LOCATION);

            // Test the behavior for newHandler  CenterLocation a sender an empty payload to pass along
            // Our code should fill in the payload and pass it along to the testHandler.
            var jsonVal = {
                location: {lat: 1, lon: 2},
                zoom: 10000
            };
            var sender = {
                id: INSTANCE_ID
            };

            // Spy on Error and call our wrapper handler.
            spyOn(Error, 'send');
            newHandler(Ozone.util.toString(sender), jsonVal); 

            // We don't expect error to be called
            expect(Error.send.calls.length).toEqual(0);

            // We DO expect testHandler to have been called and the missing jsonVal items to have been
            // filled in.
            expect(testHandler.calls.length).toEqual(1);
            expect(testHandler.mostRecentCall.args[1].location.lat).toEqual(1);
            expect(testHandler.mostRecentCall.args[1].location.lon).toEqual(2);
            expect(testHandler.mostRecentCall.args[1].zoom).toEqual(10000);
        });

        it("passes object arrays to added handlers and validates a zoom range", function() {

            var eventing = OWF.Eventing;
            spyOn(eventing, 'subscribe');

            var testHandler = jasmine.createSpy('testHandler');
            var newHandler = CenterLocation.addHandler(testHandler);
            expect(eventing.subscribe.mostRecentCall.args[0]).toEqual(Channels.MAP_VIEW_CENTER_LOCATION);

            // Test the behavior for newHandler  Create a sender an empty payload to pass along
            // Our code should fill in the payload and pass it along to the testHandler.
            var jsonVal = [{
                location: {lat: 1, lon: 2},
                zoom: 1000
            },{
                location: {lat: 3, lon: 4},
                zoom: "auto"
            }];
            var sender = {
                id: INSTANCE_ID
            };

            // Spy on Error and call our wrapper handler.
            spyOn(Error, 'send');
            newHandler(Ozone.util.toString(sender), jsonVal); 

            // We don't expect error to be called
            expect(Error.send.calls.length).toEqual(0);

            // We DO expect testHandler to have been called and the jsonVal values to
            // carry through unchanged.  Any missing featureId should be filled in.
            expect(testHandler.calls.length).toEqual(1);
            expect(testHandler.mostRecentCall.args[1].length).toEqual(2);
            expect(testHandler.mostRecentCall.args[1][0].zoom).toEqual(1000);
            expect(testHandler.mostRecentCall.args[1][0].location.lat).toEqual(1);
            expect(testHandler.mostRecentCall.args[1][0].location.lon).toEqual(2);
            expect(testHandler.mostRecentCall.args[1][1].zoom).toEqual("auto");
            expect(testHandler.mostRecentCall.args[1][1].location.lat).toEqual(3);
            expect(testHandler.mostRecentCall.args[1][1].location.lon).toEqual(4);
        });
    });
});