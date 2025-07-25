import scrapy


class PracticeWonsilbotSpider(scrapy.Spider):
    name = "Practice_WonsilBot"
    allowed_domains = ["crawlingtest.netlify.app"]
    start_urls = ["https://crawlingtest.netlify.app"]

    def parse(self, response):
        
        pass
