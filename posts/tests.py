from django.test import TestCase


class PostPageRouteTests(TestCase):
    def test_post_pages_and_api_routes_are_removed(self):
        paths = (
            '/posts/example/',
            '/posts/edit/',
            '/posts/edit/example/',
            '/posts/save/',
            '/posts/delete/',
            '/posts/like/',
            '/posts/comment/',
        )
        for path in paths:
            with self.subTest(path=path):
                self.assertEqual(self.client.get(path).status_code, 404)
