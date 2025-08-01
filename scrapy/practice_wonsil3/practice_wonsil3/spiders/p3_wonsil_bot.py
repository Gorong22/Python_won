import scrapy
from practice_wonsil3.items import racticeWonsil3Item

class P3WonsilBotSpider(scrapy.Spider):
    name = "p3_wonsil_bot"
    allowed_domains = ["davelee-fun.github.io"]
    start_urls = ["https://davelee-fun.github.io"]

    def parse(self, response):
        pass
