using System;
using System.Collections.Generic;
using System.Linq;

namespace SmartEcommerceAPI.DataMining
{
    public class AssociationRule
    {
        public int AntecedentId { get; set; }
        public string AntecedentName { get; set; } = string.Empty;
        public int ConsequentId { get; set; }
        public string ConsequentName { get; set; } = string.Empty;
        public double Support { get; set; }
        public double Confidence { get; set; }
    }

    public class AprioriAlgorithm
    {
        public static List<AssociationRule> GenerateRules(
            List<List<int>> transactions, 
            Dictionary<int, string> itemNames, 
            double minSupport = 0.05, 
            double minConfidence = 0.3)
        {
            int totalTransactions = transactions.Count;
            if (totalTransactions == 0) return new List<AssociationRule>();

            var itemFrequencies = new Dictionary<int, int>();
            foreach (var transaction in transactions)
            {
                var uniqueItems = transaction.Distinct().ToList();
                foreach (var item in uniqueItems)
                {
                    if (!itemFrequencies.ContainsKey(item)) itemFrequencies[item] = 0;
                    itemFrequencies[item]++;
                }
            }

            var frequentItems = itemFrequencies
                .Where(kvp => (double)kvp.Value / totalTransactions >= minSupport)
                .Select(kvp => kvp.Key)
                .ToHashSet();

            var pairFrequencies = new Dictionary<(int, int), int>();
            foreach (var transaction in transactions)
            {
                var items = transaction.Where(i => frequentItems.Contains(i)).Distinct().OrderBy(i => i).ToList();
                for (int i = 0; i < items.Count - 1; i++)
                {
                    for (int j = i + 1; j < items.Count; j++)
                    {
                        var pair = (items[i], items[j]);
                        if (!pairFrequencies.ContainsKey(pair)) pairFrequencies[pair] = 0;
                        pairFrequencies[pair]++;
                    }
                }
            }

            var rules = new List<AssociationRule>();
            foreach (var kvp in pairFrequencies)
            {
                double supportAB = (double)kvp.Value / totalTransactions;
                if (supportAB < minSupport) continue;

                int itemA = kvp.Key.Item1;
                int itemB = kvp.Key.Item2;

                double supportA = (double)itemFrequencies[itemA] / totalTransactions;
                double supportB = (double)itemFrequencies[itemB] / totalTransactions;

                double confAB = supportAB / supportA;
                if (confAB >= minConfidence)
                {
                    rules.Add(new AssociationRule
                    {
                        AntecedentId = itemA,
                        AntecedentName = itemNames.GetValueOrDefault(itemA, $"Item #{itemA}"),
                        ConsequentId = itemB,
                        ConsequentName = itemNames.GetValueOrDefault(itemB, $"Item #{itemB}"),
                        Support = supportAB,
                        Confidence = confAB
                    });
                }

                double confBA = supportAB / supportB;
                if (confBA >= minConfidence)
                {
                    rules.Add(new AssociationRule
                    {
                        AntecedentId = itemB,
                        AntecedentName = itemNames.GetValueOrDefault(itemB, $"Item #{itemB}"),
                        ConsequentId = itemA,
                        ConsequentName = itemNames.GetValueOrDefault(itemA, $"Item #{itemA}"),
                        Support = supportAB,
                        Confidence = confBA
                    });
                }
            }

            return rules.OrderByDescending(r => r.Confidence).ThenByDescending(r => r.Support).ToList();
        }
    }
}
