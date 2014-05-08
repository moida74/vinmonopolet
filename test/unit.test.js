'use strict';

var redtape = require('redtape');
var fs = require('fs');
var nock = require('nock');
var vinmonopolet = require('../');
var domain = 'http://www.vinmonopolet.no';

var overviewPath = vinmonopolet.OVERVIEW_URL.replace(domain, '');
var overviewResponse = fs.readFileSync(__dirname + '/fixtures/overview-response.html', { encoding: 'utf8' });

var searchPath = vinmonopolet.SEARCH_URL.replace(domain, '');
var searchResponse1 = fs.readFileSync(__dirname + '/fixtures/search-response-1.html', { encoding: 'utf8' });
var searchResponse2 = fs.readFileSync(__dirname + '/fixtures/search-response-2.html', { encoding: 'utf8' });

var productPath = vinmonopolet.PRODUCT_URL.replace(domain, '');
var productResponse = fs.readFileSync(__dirname + '/fixtures/product-detail-response.html', { encoding: 'utf8' });

var mock;

var test = redtape({
    beforeEach: function (cb) {
        mock = nock(domain);
        cb();
    },
    afterEach: function (cb) {
        mock.done();
        cb();
    }
});

test('crawler handles 404-error on category retrieval gracefully', function(t) {
    mock.get(overviewPath).reply(404);

    vinmonopolet.getCategories(function(err) {
        t.ok(err, 'should error on invalid response');
        t.end();
    });
});

test('crawler interprets no found categories as error', function(t) {
    mock.get(overviewPath).reply(200, 'Invalid HTML');

    vinmonopolet.getCategories(function(err) {
        t.ok(err, 'should error on no categories');
        t.equal('No categories found', err, 'should have correct error message');
        t.end();
    });
});

test('crawler is able to extract categories on sane response', function(t) {
    mock.get(overviewPath).reply(200, overviewResponse);

    vinmonopolet.getCategories(function(err, categories) {
        if (err) { t.error(err); }

        // Found all categories?
        t.equal(categories.length, 9);

        // Correct first and last title, count and filterId?
        if (categories.length >= 9) {
            t.equal(categories[0].title, 'Rødvin', 'should have correct category title');
            t.equal(categories[0].count, 6033, 'should have correct category item count');
            t.equal(categories[0].filterId, 25, 'should have correct category filter id');

            t.equal(categories[8].title, 'Alkoholfritt', 'should have correct category title');
            t.equal(categories[8].count, 56, 'should have correct category item count');
            t.equal(categories[8].filterId, 25, 'should have correct category filter id');
        }

        t.end();
    });
});

test('crawler handles 404-error on product search retrieval gracefully', function(t) {
    mock.get(searchPath + '?query=*&sort=2&sortMode=0&filterIds=25&filterValues=Alkoholfritt&page=1').reply(404);

    vinmonopolet.getProductsByFilters({ 25: 'Alkoholfritt' }, function(err) {
        t.ok(err, 'should error on invalid response');
        t.end();
    });
});

test('crawler is able to extract products from a category', function(t) {
    mock.get(searchPath + '?query=*&sort=2&sortMode=0&filterIds=25&filterValues=Alkoholfritt&page=1').reply(200, searchResponse1);
    mock.get(searchPath + '?query=*&sort=2&sortMode=0&filterIds=25&filterValues=Alkoholfritt&page=1').reply(200, searchResponse1);
    mock.get(searchPath + '?query=*&sort=2&sortMode=0&filterIds=25&filterValues=Alkoholfritt&page=2').reply(200, searchResponse2);

    vinmonopolet.getProductsByFilters({ 25: 'Alkoholfritt' }, function(err, products) {
        if (err) { t.error(err); }

        // Found all products?
        t.equal(products.length, 56, 'should find all products for filter');

        // Correct values for first and last product?
        if (products.length >= 56) {
            t.equal(products[0].title, '3 Horses Apple Malt Beverage', 'should have correct product title');
            t.equal(products[0].sku, 109802, 'should have correct product sku');
            t.equal(products[0].containerSize, '33 cl', 'should have correct product container size');
            t.equal(products[0].price, 19.9, 'should have correct product price');
            t.equal(products[0].pricePerLiter, 60.3, 'should have correct product price per liter');

            t.equal(products[55].title, 'Weihenstephaner Hefeweissbier Alkoholfrei', 'should have correct product title');
            t.equal(products[55].sku, 116502, 'should have correct product sku');
            t.equal(products[55].containerSize, '50 cl', 'should have correct product container size');
            t.equal(products[55].price, 24.4, 'should have correct product price');
            t.equal(products[55].pricePerLiter, 48.8, 'should have correct product price per liter');
        }

        t.end();
    });
});

test('crawler handles 404-error on product information retrieval gracefully', function(t) {
    mock.get(productPath + 9351702 + vinmonopolet.PRODUCT_QUERY_PARAMS).reply(404);

    vinmonopolet.getProductDetails(9351702, function(err) {
        t.ok(err, 'should error on invalid response');
        t.end();
    });
});

test('crawler is able to extract product info', function(t) {
    var sku = 9351702;
    mock.get(productPath + sku + vinmonopolet.PRODUCT_QUERY_PARAMS).reply(200, productResponse);

    vinmonopolet.getProductDetails(sku, function(err, product) {
        if (err) { t.error(err); }

        t.equal(product.title, 'Ægir Lynchburg Natt Barrel-Aged Imperial Porter', 'should have correct product title');
        t.equal(product.sku, sku, 'should have correct product sku');
        t.equal(product.containerSize, '50 cl', 'should have correct product container size');
        t.equal(product.price, 159.9, 'should have correct product price');
        t.equal(product.pricePerLiter, 319.8, 'should have correct product price per liter');
        t.equal(product.productType, 'Overgjæret', 'should have correct product type');
        t.equal(product.productSelection, 'Bestillingsutvalg', 'should have correct product selection');
        t.equal(product.shopCategory, 'Uavhengig sortiment', 'should have correct shop category');
        t.equal(product.color, 'Mørk', 'should have correct product color');
        t.equal(product.aroma, 'Kaffe, mørkt malt, fat, whisky, noe vanilje.', 'should have correct product aroma');
        t.equal(product.taste, 'God fylde og bitterhet, kaffe, sjokolade og noe fat, lang avslutning.');
        t.equal(product.foodPairings, 'Apertiff', 'should have correct food pairings');
        t.equal(product.countryRegion, 'Norge, Øvrige', 'should have correct product country/region');
        t.equal(product.ingredients, 'Maltet bygg, humle, gjær, vann', 'should have correct product ingredients');
        t.equal(product.alcohol, 10.01, 'should have correct product alcohol percentage');
        t.equal(product.sugar, 'Ukjent', 'should have correct product sugar info');
        t.equal(product.acid, 'Noe', 'should have correct product acid info');
        t.equal(product.storable, 'Drikkeklar nå, men kan også lagres', 'should have correct product storage info');
        t.equal(product.manufacturer, 'Ægir Bryggeri', 'should have correct product manufacturer');
        t.equal(product.wholesaler, 'Cask Norway AS', 'should have correct product wholesaler');
        t.equal(product.distributor, 'SKANLOG VSD AS', 'should have correct product distributor');
        t.equal(product.containerType, 'Engangsflasker av glass', 'should have correct product container type');

        t.end();
    });
});

